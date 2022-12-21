listen($("#toolInput"), "input", () => {
    setContent($("#toolResult"), $("#toolInput").value);
    // LER.parse($("#toolResult"));
});
