kongUtil.use('$', '$$', 'listen', 'fetchDOM', 'clearElement', 'createElementFromJsonML');

// 顯示專案版本
setContent($("#version"), "v" + browser.runtime.getManifest().version);

/**
 * 自己刻一個簡單的 router
 */
const routes = [
    {title: "選項", name: "general"},
    {title: "例外", name: "exclusion"},
    {title: "更新", name: "update"},
    {title: "關於", name: "docs"},
    {title: "工具", name: "tool"}
];

let activeTab;
const main = $("main");
routes.forEach((route, index) => {
    const tab = createElementFromJsonML(
        ['li', {class: 'nav-item me-2'},
            ['span', {class: 'nav-link btn'},
                route.title
            ]
        ]
    );
    $("#navbar").appendChild(tab);

    const container = createElementFromJsonML(
        ['div', {id: `name-${route.name}`}]
    );
    listen(tab, "click", () => {
        if(tab.classList.contains("active")) return;
        $$("header .nav-link").forEach(nl => nl.classList.remove("active"));
        tab.lastChild.classList.add("active");
        clearElement(main);
        main.append(container);
        history.replaceState(null, null, `#${route.name}`);
    });

    listen(tab, "click", () => {
        fetchDOM(`${route.name}.html`)
        .then(doc => {
            container.append(...doc.body.childNodes);
            document.head.append(createElementFromJsonML(
                ['script', {src: `${route.name}.js`}]
            ));
        });
    }, {once: true});

    if(!index || route.name === location.hash.substring(1)) activeTab = tab;
});

activeTab.dispatchEvent(new Event("click"));


/**** functions ****/
function hide(elem) { elem.style.display = "none"; }
function show(elem) { elem.style.display = ""; }

function setContent(elem, ...nodes) {
    clearElement(elem);
    elem.append(...nodes);
}
