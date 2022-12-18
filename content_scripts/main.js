const container = document.createElement('div');
container.style.cssText = 'position: static; width: 0; height: 0;';
document.body.append(container);

const shadow = container.attachShadow({mode: 'open'});
shadow.append(createElementFromJSON(
    {h1: {
        style: 'position: absolute; top: 6em; left: 6em;',
        text: '法規亦毒氣'
    }}
));
