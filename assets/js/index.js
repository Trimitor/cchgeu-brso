const proxies = [
    'https://cors-anywhere.kosmi.io/',
    'https://cors-anywhere.clcl.org/',
    'https://cors-anywhere.hellowoofy.com/',
    'https://cors-anywhere-bc.herokuapp.com/',
    'https://cors-anywhere.wcx.cloud/',
    'https://customcorsanywhere.herokuapp.com/',
    'https://your-cors.herokuapp.com/',
    'https://cors.noroff.dev/'
];
const schedule_url = 'https://cchgeu.ru/studentu/schedule/stf/';
const main_url = 'https://cchgeu.ru/';
const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

let parsedSchedule = [];

function getRandomProxy() {
    var proxy = proxies[Math.floor(Math.random() * proxies.length)];
    console.log(`Used proxy: ${ proxy }`);
    return proxy;
}


$(document).ready(async function () {
    const weekTypeSelector = $('#weekTypeSelector');
    const savedWeekType = localStorage.getItem('weekType') || '-1';
    weekTypeSelector.val(savedWeekType);

    const savedUpdateText = localStorage.getItem('updateText');
    updateLastUpdateText(savedUpdateText || 'Нет данных о последнем обновлении');

    weekTypeSelector.on('change', function () {
        const selectedWeekType = $(this).val();
        localStorage.setItem('weekType', selectedWeekType);
        renderSchedule(parsedSchedule, selectedWeekType);
    });

    try {
        const cachedSchedule = localStorage.getItem('cachedSchedule');

        if (cachedSchedule && savedUpdateText) {
            const isNewUpdateAvailable = await checkForUpdate(savedUpdateText);

            if (isNewUpdateAvailable) {
                await fetchAndParseSchedule();
            } else {
                parsedSchedule = JSON.parse(cachedSchedule);
                renderSchedule(parsedSchedule, savedWeekType);
            }
        } else {
            await fetchAndParseSchedule();
        }
    } catch (error) {
        handleError('Ошибка при обработке расписания:', error);
        loadCachedSchedule();
    }
});

async function checkForUpdate(savedUpdateText) {
    try {
        const response = await $.get(getRandomProxy() + schedule_url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(response, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        const scheduleLink = links.find(link => link.href.includes('bRSO_211.xls') || link.href.includes('bRSO_211.xlsx'));
        if (scheduleLink) {
            const smallElement = scheduleLink.nextElementSibling;
            const currentUpdateText = smallElement ? smallElement.textContent : '';

            return currentUpdateText !== savedUpdateText;
        }
    } catch (error) {
        handleError('Ошибка при проверке обновлений:', error);
    }
    return false;
}

async function fetchAndParseSchedule() {
    try {
        const response = await $.get(getRandomProxy() + schedule_url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(response, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        const scheduleLink = links.find(link => link.href.includes('bRSO_211.xls') || link.href.includes('bRSO_211.xlsx'));
        if (scheduleLink) {
            const smallElement = scheduleLink.nextElementSibling;
            const updateText = smallElement ? smallElement.textContent : '';

            localStorage.setItem('updateText', updateText);

            updateLastUpdateText(updateText);

            const fileUrl = scheduleLink.href.replace(window.location.href, getRandomProxy() + main_url);
            const fileResponse = await $.get(fileUrl, null, null, 'arraybuffer');
            const workbook = XLSX.read(new Uint8Array(fileResponse), { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            parsedSchedule = parseSchedule(sheet);
            localStorage.setItem('cachedSchedule', JSON.stringify(parsedSchedule));
            renderSchedule(parsedSchedule, localStorage.getItem('weekType') || '-1');
        }
    } catch (error) {
        handleError('Ошибка при загрузке или обработке файла:', error);
        loadCachedSchedule();
    }
}

function loadCachedSchedule() {
    const cachedSchedule = localStorage.getItem('cachedSchedule');
    if (cachedSchedule) {
        parsedSchedule = JSON.parse(cachedSchedule);
        const savedWeekType = localStorage.getItem('weekType') || '-1';
        renderSchedule(parsedSchedule, savedWeekType);
    } else {
        console.warn('Нет данных в кэше для отображения.');
    }
}

function handleError(message, error) {
    console.error(message, error);
    $('.alert').removeClass('d-none');
}

function parseSchedule(data) {
    const schedule = [];
    const bKeys = Object.keys(data).filter(key => key.startsWith("B"));
    const numbers = bKeys.map(key => parseInt(key.substring(1)));
    const sN = Math.min(...numbers);
    const eN = Math.max(...numbers) + 1;

    let dayIndex = -1;
    let currentTime = "";

    for (let i = sN; i <= eN; i++) {
        const dayCell = data[`A${i}`]?.v;
        if (dayCell && daysOfWeek.includes(dayCell)) {
            dayIndex++;
            schedule.push({ day: daysOfWeek[dayIndex], lessons: [] });
        }

        const timeCell = data[`B${i}`]?.v;
        if (timeCell) {
            currentTime = timeCell;
        }

        if (!currentTime || dayIndex < 0) continue;

        const lessonCell = data[`D${i}`]?.v || null;
        const audCell = data[`F${i}`]?.v || null;

        const dayEntry = schedule[dayIndex];
        let lessonEntry = dayEntry.lessons.find(item => item.time === currentTime);

        if (!lessonEntry) {
            lessonEntry = { time: currentTime, items: [] };
            dayEntry.lessons.push(lessonEntry);
        }

        lessonEntry.items.push({ name: lessonCell, aud: audCell });
    }

    return schedule;
}

function renderSchedule(schedule, weekType) {
    const $accordionContainer = $('#accordionContainer');
    $accordionContainer.empty();

    const $fragment = $(document.createDocumentFragment());

    schedule.forEach((daySchedule, dayIndex) => {
        const dayName = daySchedule.day;
        const lessons = daySchedule.lessons;

        const $accordionItem = $('<div class="accordion-item"></div>');

        const $accordionHeader = $('<h2 class="accordion-header" role="tab"></h2>');

        const $accordionButton = $(`<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#item-${dayIndex}" aria-expanded="false" aria-controls="item-${dayIndex}">${dayName}</button>`);

        $accordionHeader.append($accordionButton);
        $accordionItem.append($accordionHeader);

        const $accordionCollapse = $(`<div class="accordion-collapse collapse" id="item-${dayIndex}" role="tabpanel" data-bs-parent="#accordionContainer"></div>`);

        const $accordionBody = $('<div class="accordion-body"></div>');

        const $tableContainer = $('<div class="table-responsive"></div>');

        const $table = $('<table class="table"></table>');
        const $tbody = $('<tbody></tbody>');

        lessons.forEach(lesson => {
            const time = lesson.time;
            let itemsToRender = [];

            if (weekType === '-1') {
                itemsToRender = lesson.items;
            } else if (weekType === '0' && lesson.items[0]) {
                itemsToRender.push(lesson.items[0]);
            } else if (weekType === '1' && lesson.items[1]) {
                itemsToRender.push(lesson.items[1]);
            }

            itemsToRender.forEach((item, index) => {
                const $row = $('<tr></tr>');

                if (index === 0) {
                    const $timeCell = $(`<td rowspan="${itemsToRender.length}">${time}</td>`);
                    $row.append($timeCell);
                }

                const $lessonCell = $(`<td>${item.name || '—'}</td>`);

                const $audCell = $(`<td>${item.aud || '—'}</td>`);

                $row.append($lessonCell);
                $row.append($audCell);

                $tbody.append($row);
            });
        });

        $table.append($tbody);
        $tableContainer.append($table);
        $accordionBody.append($tableContainer);
        $accordionCollapse.append($accordionBody);
        $accordionItem.append($accordionCollapse);

        $fragment.append($accordionItem);
    });

    $accordionContainer.append($fragment);
    console.log('Ready!');
}

function updateLastUpdateText(updateText) {
    $('#lastUpdate').text(updateText);
}
