const proxies = [
    //'https://cors-anywhere.kosmi.io/',
    // 'https://cors-anywhere.clcl.org/',
    // 'https://cors-anywhere.hellowoofy.com/',
    'https://cors-anywhere-bc.herokuapp.com/',
    // 'https://cors-anywhere.wcx.cloud/',
    //'https://your-cors.herokuapp.com/',
    'https://cors.noroff.dev/',
];
const schedule_url = 'https://cchgeu.ru/studentu/schedule/stf/';
const main_url = 'https://cchgeu.ru/';
const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

let parsedSchedule = [];

function getRandomProxy() {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

document.addEventListener('DOMContentLoaded', () => {
    const weekTypeSelector = document.getElementById('weekTypeSelector');
    const lastUpdateElement = document.getElementById('updateDateText');
    const updateSpinner = document.getElementById('updateSpinner');

    const savedWeekType = localStorage.getItem('weekType') || '-1';
    weekTypeSelector.value = savedWeekType;

    const savedSchedule = localStorage.getItem('schedule');
    const savedLastUpdate = localStorage.getItem('lastUpdate');

    // Отобразить сохранённое расписание и дату
    if (savedSchedule && savedLastUpdate) {
        parsedSchedule = JSON.parse(savedSchedule);
        lastUpdateElement.textContent = savedLastUpdate;
        renderSchedule(parsedSchedule, savedWeekType);
    }

    function updateSchedule() {
        const proxy = getRandomProxy();

        fetch(proxy + schedule_url)
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const links = Array.from(doc.querySelectorAll('a'));

                const scheduleLink = links.find(link => link.href.includes('bRSO_211.xls') || link.href.includes('bRSO_211.xlsx'));

                if (scheduleLink) {
                    const fileUrl = scheduleLink.href.replace(window.location.href, proxy + main_url);
                    const smallElement = scheduleLink.nextElementSibling;
                    const updateText = smallElement ? smallElement.textContent : '';

                    if (savedLastUpdate !== updateText) {
                        // Показываем спиннер
                        updateSpinner.classList.remove('d-none');

                        fetch(fileUrl)
                            .then(response => response.arrayBuffer())
                            .then(data => {
                                const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
                                const sheetName = workbook.SheetNames[0];
                                const sheet = workbook.Sheets[sheetName];

                                parsedSchedule = parseSchedule(sheet);

                                // Обновляем localStorage
                                localStorage.setItem('schedule', JSON.stringify(parsedSchedule));
                                localStorage.setItem('lastUpdate', updateText);

                                // Обновляем расписание на странице
                                lastUpdateElement.textContent = updateText;
                                renderSchedule(parsedSchedule, savedWeekType);

                                // Скрываем спиннер
                                updateSpinner.classList.add('d-none');
                            })
                            .catch(error => handleError('Ошибка при загрузке или обработке файла:', error));
                    } else {
                        // Данные актуальны, скрываем спиннер
                        console.log(`Данные актуальны. Local: ${savedLastUpdate}. Remote: ${updateText}`)
                        updateSpinner.classList.add('d-none');
                    }
                }
            })
            .catch(error => handleError('Ошибка при выполнении запроса:', error));
    }

    weekTypeSelector.addEventListener('change', () => {
        const selectedWeekType = weekTypeSelector.value;
        localStorage.setItem('weekType', selectedWeekType);
        renderSchedule(parsedSchedule, selectedWeekType);
    });

    function handleError(message, error) {
        console.error(message, error);
        document.querySelector('.alert').classList.remove('d-none');
        updateSpinner.classList.add('d-none');
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

    // Начать обновление расписания
    updateSchedule();
});

function renderSchedule(schedule, weekType) {
    const accordionContainer = document.getElementById('accordionContainer');
    accordionContainer.innerHTML = '';

    schedule.forEach((daySchedule, dayIndex) => {
        const dayName = daySchedule.day;
        const lessons = daySchedule.lessons;

        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';

        const accordionHeader = document.createElement('h2');
        accordionHeader.className = 'accordion-header';
        accordionHeader.setAttribute('role', 'tab');

        const accordionButton = document.createElement('button');
        accordionButton.className = 'accordion-button collapsed';
        accordionButton.type = 'button';
        accordionButton.setAttribute('data-bs-toggle', 'collapse');
        accordionButton.setAttribute('data-bs-target', `#accordionContainer .item-${dayIndex}`);
        accordionButton.setAttribute('aria-expanded', 'false');
        accordionButton.setAttribute('aria-controls', `accordionContainer .item-${dayIndex}`);
        accordionButton.textContent = dayName;

        accordionHeader.appendChild(accordionButton);
        accordionItem.appendChild(accordionHeader);

        const accordionCollapse = document.createElement('div');
        accordionCollapse.className = `accordion-collapse collapse item-${dayIndex}`;
        accordionCollapse.setAttribute('role', 'tabpanel');
        accordionCollapse.setAttribute('data-bs-parent', '#accordionContainer');

        const accordionBody = document.createElement('div');
        accordionBody.className = 'accordion-body';

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';

        const table = document.createElement('table');
        table.className = 'table';

        const tbody = document.createElement('tbody');

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
                const row = document.createElement('tr');

                if (index === 0) {
                    const timeCell = document.createElement('td');
                    timeCell.rowSpan = itemsToRender.length;
                    timeCell.textContent = time;
                    row.appendChild(timeCell);
                }

                const lessonCell = document.createElement('td');
                lessonCell.textContent = item.name || '—';

                const audCell = document.createElement('td');
                audCell.textContent = item.aud || '—';

                row.appendChild(lessonCell);
                row.appendChild(audCell);

                tbody.appendChild(row);
            });
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);
        accordionBody.appendChild(tableContainer);
        accordionCollapse.appendChild(accordionBody);
        accordionItem.appendChild(accordionCollapse);

        accordionContainer.appendChild(accordionItem);
    });
}
