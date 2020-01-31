export default function(text) {
    let document = removeBackslash(lineRegex(documentRegex(text))).split(/\r?\n/)
    return `<section class="moodle">${document.map(i => `<p>${i}</p>`).join('')}</section>`;
}

function documentRegex(text) {
    const newLineAnswer = /([^\\]|[^\S\r\n][^=])(=|~)/g
    const correctAnswer = /([^\\]|^{)(([^\\]|^|\\s*)=(.*)(?=[=~}]|\\n))/g;
    const incorrectAnswer = /([^\\]|^{)(([^\\]|^|\\s*)~(.*)(?=[=~}]|\\n))/g;

    return text
    .replace(newLineAnswer, `\n$2`)
    .replace(correctAnswer, `$1<li>$4</li>`)
    .replace(incorrectAnswer, `$1<li>$4</li>`)
}

function lineRegex(text) {
    return text
    .split(/\r?\n/)
    .map(comment => comment.replace(/(^[ \\t]+)?(([\W\n]|^)(\/\/)+).+/g, ''))
    .map(category => category.replace(/(^[ \\t]+)?(((^|\n)\s*[$]CATEGORY:))(.+)/g, `<br><b>$5</b><br>`))
    .map(title => title.replace(/\s*(::)\s*(.*?)(::)/g, `<br><b>$2</b><br>`))
    .map(openBracket => openBracket.replace(/([^\\]|^){([#])?/g, `$1<br>`))
    .map(closeBracket => closeBracket.replace(/([^\\]|^)}/g, `$1<br>`))
    .join('')
}

function removeBackslash(text) {
    return text.split(/\r?\n/)
    .map(colon => colon.replace(/[\\]:/g, ":"))
    .map(openBracket => openBracket.replace(/[\\]{/g, "{"))
    .map(closeBracket => closeBracket.replace(/[\\]}/g, "}"))
    .join('')
}