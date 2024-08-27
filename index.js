const url = 'https://api.cors.lol/url=https://cchgeu.ru/studentu/schedule/stf/';

fetch(url)
    .then(response => response.text())
    .then(html => {
        console.log(html);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');

        links.forEach(link => {
            if (link.href.includes('bRSO_211.xlsx')) {
                console.log('Найдена ссылка:', link.href);
            }
        });
    })
    .catch(err => {
        console.error('Ошибка при загрузке страницы:', err);
    });
