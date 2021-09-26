"use strict";

const booleanOptions = ["autoParse", "enablePopup", "mojAddReferringArticles"];

/**
 * 條號轉換方式的選擇
 */
const artNumberParserOptions = [
    {
        title: "不轉換",
        value: "none",
        example: "第九十一條之一第二項第五款"
    },
    {
        title: "把中文數字轉成阿拉伯數字",
        value: "parseInt",
        example: "第 91 條之 1 第 2 項第 5 款"
    },
    {
        title: "重組條號的「之」結構",
        value: "hyphen",
        example: "第 91-1 條第 2 項第 5 款"
    },
    {
        title: "使用「§」符號",
        value: "dollar",
        example: "§91-1 第 2 項第 5 款"
    }/*,
    { // 必須要只在有「條」的時候才適合啟動，機制要再修…
        title: "連同「項」跟「款」也用簡記的方式",
        value: "shortest",
        example: "§91-1 Ⅱ⑤"   // 羅馬數字：U+2160~216B ；圓圈數字：U+2460~2473
    }*/
].map(option => {
    const optionProps = {
        type: "radio",
        name: "artNumberParserMethod",
        id: "artNumberParserMethod-" + option.value,
        value: option.value,
        onchange: () => setData({artNumberParserMethod: option.value})
    };
    return e("tr", null,
        e("td", null,
            e("label", null,
                e("input", optionProps),
                option.title
            )
        ),
        e("td", null,
            e("label", {"for": optionProps.id}, option.example)
        )
    );
});
$("#artNumberParserOptions").append(...artNumberParserOptions);

getData(booleanOptions.concat("artNumberParserMethod"))
.then(storage => {
    $("#artNumberParserMethod-" + storage.artNumberParserMethod).checked = true;
    booleanOptions.forEach(option => {
        const checkbox = document.getElementById(option);
        checkbox.checked = storage[option];
        checkbox.addEventListener("change", () =>
            setData({ [option]: checkbox.checked })
        );
    });
});
