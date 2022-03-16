/**
 * Проверка значения на пустоту
 * @param {*} value - проверяемое значение
 * @returns {boolean}
 */
function isEmpty(value) {
    return (value === undefined || value === null || value === '');
}

/**
 * Клонирование объекта/массива.
 * @param {*} obj - объект/массив/свойство/элемент массива
 * @return {Object|Array} - копия указанного элемента
 * @private
 */
function cloneDeep(obj) {
    let res;
    if (Array.isArray(obj)) {
        res = [];
        obj.forEach((i) => {
            res.push(cloneDeep(i));
        });
        return res;
    } else if (toString.call(obj) === '[object Object]') {
        res = {};
        Object.keys(obj).forEach((k) => {
            res[k] = cloneDeep(obj[k]);
        });
    } else {
        res = obj;
    }
    return res;
}

/**
 * Установка значения по пути в объекте
 * @param {Object} object - редактируемый объект
 * @param {string} path - путь в объекте в виде строки, например, 'prop1.prop2.0.prop3'
 * @param {*} value - устанавливаемое значение
 * @param {string} [delimiter] - разделитель узлов в path
 */
function setPath(object, path, value, delimiter = '.') {
    path = path.split(delimiter);
    let i;
    for (i = 0; i < path.length - 1; i++) {
        if (!object[path[i]] && path[i + 1]) {
            object[path[i]] = isNaN(path[i + 1]) ? {} : [];
        }
        object = object[path[i]];
    }
    object[path[i]] = value;
}

/**
 * Получение значения по пути в объекте
 * @param {Object} object - редактируемый объект
 * @param {string} path - путь в объекте в виде строки, например, 'prop1.prop2.0.prop3'
 * @param {string} [delimiter] - разделитель узлов в path
 * @return {*}
 */
function getPath(object, path, delimiter = '.') {
    path = path.split(delimiter);
    let i;
    for (i = 0; i < path.length - 1; i++) {
        if (!object[path[i]]) {
            return;
        }
        object = object[path[i]];
    }
    return object[path[i]];
}

/**
 * Формирование объекта по строке описанию и значениям
 * @param {string} str - описание вида '...;obj.t;val'
 * @param {*[]} args - значения
 * @return {{}}
 */
function compose(str, ...args) {
    const result = {};
    const desc = str.split(';');
    desc.forEach((name, index) => {
        if (name === '...') {
            Object.assign(result, args[index]);
            return;
        }
        const path = name.split('.');
        let i;
        let obj = result;
        for (i = 0; i < path.length - 1; i++) {
            if (!obj[path[i]]) obj[path[i]] = {};
            obj = obj[path[i]];
        }
        obj[path[i]] = args[index];
    });
    return result;
}

/**
 * Очистка объекта с данными от служебных свойств
 * @param {Object} obj
 */
function clearObj(obj) {
    if (obj instanceof Object) {
        for (const prop in obj) {
            if (prop.startsWith('__')) {
                delete obj[prop];
            } else {
                const o = obj[prop];
                if (o instanceof Object) clearObj(o);
            }
        }
    }
}

export {
    isEmpty,
    cloneDeep,
    setPath,
    getPath,
    compose,
    clearObj
};
