"use strict";

// 設定預設法規
const params = new URLSearchParams(location.search);
const pcode = params.get("pcode");
if(pcode) LER.loadLaws.then(() =>
    LER.defaultLaw = LER.getLaw({PCode: pcode})
);
