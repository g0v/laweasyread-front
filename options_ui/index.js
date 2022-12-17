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


/**** functions ****/
function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function hide(elem) { elem.style.display = "none"; }
function show(elem) { elem.style.display = ""; }
function clearElement(elem) { while(elem.lastChild) elem.lastChild.remove(); }

function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
}

function setContent(elem, ...nodes) {
    let last;
    while(last = elem.lastChild) last.remove();
    elem.append(...nodes);
}

async function fetchDOM(...args) {
    const res = await fetch(...args);
    const html = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
}

function createElement(jsml) {
    if(typeof jsml === 'string') return document.createTextNode(jsml);
    if(jsml instanceof Array) return jsml.map(createElement);
    if(typeof jsml.cloneNode === 'function') return jsml.cloneNode(true);

    let tag = jsml.tag;
    if(!tag) {
        tag = Object.keys(jsml)[0];
        jsml = jsml[tag];
    }

    const elem = document.createElement(tag);
    if(typeof jsml === 'string') jsml = {text: jsml};

    for(let prop in jsml) {
        const value = jsml[prop];
        prop = prop.toLowerCase();
        if(prop.startsWith('on')) {
            elem.addEventListener(prop.substring(2), value);
            continue;
        }
        switch(prop) {
            case '.':
            case 'class':
            case 'classname': {
                const list = (typeof value === 'string') ? value.split(' ') : value;
                elem.classList.add(...(list.filter(x => x)));
                break;
            }
            case 'css':
            case 'style': {
                if(typeof value === 'string') elem.style.cssText = value;
                else for(let sp in value) elem.style[sp] = value[sp];
                break;
            }
            case '#': {
                elem.id = value;
                break;
            }
            case 'text': {
                elem.append(createElement(value));
                break;
            }
            case '$':
            case 'children': {
                elem.append(...value.map(createElement));
                break;
            }
            case 'data':
            case 'dataset': {
                for(let ds in value) elem.dataset[ds] = value[ds];
                break;
            }
            case 'tag': break;
            default: elem.setAttribute(prop, value);
        }
    }
    return elem;
}
