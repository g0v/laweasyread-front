"use strict";

$("#toolInput").addEventListener("input", () => {
    setContent("#toolResult", $("#toolInput").value);
    // LER.parse($("#toolResult"));
});
