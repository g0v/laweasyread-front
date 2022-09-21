"use strict";
kongUtil.use();
const setContent = (elem, ...nodes) => {
    let last;
    while(last = elem.lastChild) last.remove();
    elem.append(...nodes);
};
const hide = elem => elem.style.display = "none";
const show = elem => elem.style.display = "";


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
    const tab = createElement(
        {li: {
            class: "nav-item me-2",
            children: [
                {span: {
                    class: "nav-link btn",
                    text: route.title
                }}
            ]
        }}
    );
    $("#navbar").appendChild(tab);

    const container = createElement({div: {id: `name-${route.name}`}});
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
            document.head.append(createElement({script: {src: `${route.name}.js`}}));
        });
    }, {once: true});

    if(!index || route.name === location.hash.substring(1)) activeTab = tab;
});

activeTab.dispatchEvent(new Event("click"));
