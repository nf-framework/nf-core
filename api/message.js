import { common } from '../index.js';
import { nfMessages } from './extension.js';

/**
 * Получение расшифровки сообщения по коду из msgs.json модуля
 * @param {string} code - код сообщения
 * @param {string} namespace - пространство сообщений (первый уровень свойств из msgs.json)
 * @param {*[]} replaces - значения для замены плейсхолдеров в сообщении
 * @return {string}
 */
function getMsg(code, namespace, replaces = []) {
    let msg;
    if (namespace) {
        msg = common.getPath(nfMessages, `${namespace}~${code}`, '~');
    } else {
        msg = Object.values(nfMessages).find((nameSpace) => (nameSpace[code] !== undefined))[code];
    }
    if (msg) {
        const rx = new RegExp('{([0-9]+)}', 'g');
        msg = msg.replace(rx, (rep, gr1) => `${replaces[gr1]}`);
    }
    return msg;
}

export {
    getMsg
};
