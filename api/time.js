/**
 * Получение текущего времени ISO формате
 * @return {string}
 */
function getNowISO() {
    return new Date().toISOString();
}

export { getNowISO };
