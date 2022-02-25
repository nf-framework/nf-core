import { getNowISO } from './time.js';

/**
 * Старт отсчета этапа профилирования
 * @param {Object} tmngObj
 * @param {string} stage
 */
function timingStart(tmngObj, stage) {
    if (!tmngObj[stage]) tmngObj[stage] = {};
    tmngObj[stage].dur = process.hrtime.bigint();
    tmngObj[stage].start = getNowISO();
}

/**
 * Окончание отсчета этапа профилирования
 * @param {Object} tmngObj
 * @param {string} stage
 */
function timingEnd(tmngObj, stage) {
    tmngObj[stage].dur = Number(process.hrtime.bigint() - tmngObj[stage].dur) / 1000000;
}

/**
 * Преобразование таймингов в строку для хедера Server-Timing
 * @param {Object} timing - объект с объектами(источниками) перечней замеренных длительностей выполнений
 * @return {string}
 */
function timingToHttpHeader(timing) {
    return Object.keys(timing || {})
        .map(src => Object.keys(timing[src]).map(t => `${src}.${t};dur=${timing[src][t].dur}`).join(', '))
        .join(', ');
}

export { timingStart, timingEnd, timingToHttpHeader };
