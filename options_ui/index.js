const e = createElement;

const setContent = (elem, ...nodes) => {
    let last;
    while(last = elem.lastChild) last.remove();
    elem.append(...nodes);
};
const hide = elem => elem.style.display = "none";
const show = elem => elem.style.display = "";


// 顯示專案版本
setContent($("#version"), browser.runtime.getManifest().version);

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
    const tab = parseElement(`<li class="nav-item me-2"><span class="nav-link btn">${route.title}</span></li>`);
    $("#navbar").appendChild(tab);

    const container = parseElement(`<div id="name-${route.name}"></div>`);
    tab.addEventListener("click", () => {
        if(tab.classList.contains("active")) return;

        document.querySelectorAll("header .nav-link").forEach(nl => nl.classList.remove("active"));
        tab.lastChild.classList.add("active");
        main.lastChild?.remove();
        main.appendChild(container);
        history.replaceState(null, null, `#${route.name}`);

        // 只在第一次顯示此元件時讀取內容
        if(container.hasChildNodes()) return;
        fetchDOM(`${route.name}.html`)
        .then(doc => {
            container.append(...doc.body.childNodes);
            $("main").appendChild(container);
            document.head.appendChild(e("script", {src: `${route.name}.js`}));
        });
    });

    if(!index || route.name === location.hash.substring(1)) activeTab = tab;
});

activeTab.dispatchEvent(new Event("click"));
