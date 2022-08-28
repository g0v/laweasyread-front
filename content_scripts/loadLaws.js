"use strict";

if(!LER.loadLaws) {
    const exTermsPromise = fetch(
        browser.runtime.getURL("data/exclude_terms.txt")
    ).then(res => res.text())
    .then(text => text.split(/\r?\n\r?/).filter(x => x));

    LER.loadLaws = Promise.all([
        getData("laws"),
        exTermsPromise
    ]).then(([laws = [], exTerms = []]) => {
        const rules = laws.map(law => ({
            pattern: law.name,
            replacer: () => {
                LER.matchedAnyLaw = true;
                return {type: "law", law: law};
            },
            minLength: law.name.length
        })).concat(exTerms.map(term => ({
            pattern: term,
            replacer: () => ({type: "exclude_term", text: term}),
            minLength: term.length
        })));

        rules.sort((a, b) => b.pattern.length - a.pattern.length);
        LER.rules.unshift(...rules);
        return LER.laws = laws;
    });
}
