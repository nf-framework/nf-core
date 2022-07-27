import fs from 'fs/promises';
import path from 'path';
import glob from 'fast-glob';
import { config } from '../index.js';

const extensions = [];
let nfMenuInfo = [];
const nfMessages = {};

let sortedExtensions = [];

const extensionsPath = `${process.cwd().replace(/\\/g, '/')}/node_modules/`;
const extensionFileDefaults = {
    isDir: false,
    resArray: false,
    onlyExt: false,
    rootDir: false,
    extensions: false,
    invert: false,
    onlyFiles: true,
    rich: false
};

function getExtensionsFromConfig() {
    const exts = config['@nfjs/core']?.modules || {};
    if (!exts.disabled) {
        exts.disabled = [];
    }
    if (exts.only) {
        return exts.only.filter((ext) => exts.disabled.indexOf(ext) === -1);
    }

    return glob.sync('*/**/nf-module.js', {
        cwd: path.join(process.cwd(), 'node_modules').replace(/\\/g, '/'),
        followSymbolicLinks: true
    })
        .map((item) => item.replace('/nf-module.js', ''))
        .filter((ext) => exts.disabled.indexOf(ext) === -1);
}

async function load() {
    if (extensions.length > 0) {
        return extensions;
    }
    const modules = await glob('*/**/nf-module.js', {
        cwd: path.join(process.cwd(), 'node_modules').replace(/\\/g, '/'), followSymbolicLinks: true
    });

    const nfModules = [];
    const exts = getExtensionsFromConfig();
    for (const item of modules) {
        try {
            let name = item.split('/');
            name.pop();
            name = name.join('/');
            const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'node_modules', name, 'package.json').replace(/\\/g, '/'), 'utf-8'));
            if (exts && exts.indexOf(name) !== -1) {
                const module = await import(item);
                nfModules.push({
                    name,
                    meta: {...module.meta},
                    dirname: path.join(extensionsPath, name),
                    module,
                    services: module.services,
                    version: packageJson.version
                });
            }
        } catch(e) {
            throw new Error(`Загрузчик модуля ${item} не смог загрузиться из-за ${e.message}[${e.stack}]`);
        }
    }
    // проверить все ли нужные в зависимостях модули подключены
    const reqAbsent = [];
    for (const mod of nfModules) {
        if (mod.meta && mod.meta.require) {
            const { after: reqAfter, before: reqBefore } = mod.meta.require;
            const reqMods = (reqAfter) ? ((Array.isArray(reqAfter)) ? reqAfter : [reqAfter]) : [];
            if (reqBefore) reqMods.push(...(Array.isArray(reqBefore) ? reqBefore : [reqBefore]));
            if (reqMods.length > 0) {
                reqMods.forEach((rmod) => {
                    if ((nfModules.findIndex((i) => i.name === rmod)) === -1) reqAbsent.push({ mod: mod.name, reqmod: rmod });
                });
            }
        }
    }
    if (reqAbsent.length > 0) {
        console.warn(`Модули, указанные в зависимостях мета-описания модулей не подключены: ${reqAbsent.map((r) => `${r.reqmod} для ${r.mod}`).join('; ')}`);
    }

    // сортировка модулей по указанным в meta.require зависимостям
    const sortednfModules = [];
    const nfModulesNames = nfModules.map((x) => x.name);
    function sortModules() {
        let isSpliced = false;
        const copyNfModules = [...nfModules];
        for (const mod of copyNfModules) {
            const befores = nfModules.filter((x) => x.meta && x.meta.require &&
                (x.meta.require.before === mod.name || (Array.isArray(x.meta.require.before) && x.meta.require.before.includes(mod.name))));
            if (befores.length > 0) {
                return;
            }
            if (mod.meta && mod.meta.require && mod.meta.require.after) {
                let { after } = mod.meta.require;
                if (!Array.isArray(after)) after = [after];
                // проверка, что все модули после, которых должен быть текущий уже в списке отсортированных
                // либо не подключен
                if (after.every((z) => (sortednfModules.findIndex((x) => x.name === z) !== -1) || (!nfModulesNames.includes(z)))) {
                    sortednfModules.push(mod);
                    nfModules.splice(nfModules.indexOf(mod), 1);
                    isSpliced = true;
                }
            } else if (!sortednfModules.find((x) => x.name === mod.name)) {
                sortednfModules.push(mod);
                nfModules.splice(nfModules.indexOf(mod), 1);
                isSpliced = true;
            }
        }
        return isSpliced;
    }

    sortModules();
    while (nfModules.length !== 0) {
        const isSpliced = sortModules();
        if (!isSpliced) {
            throw new Error(`Не удалось выстроить модули в порядке зависимостей для инициализации. Возможна циклическая зависимость в модулях: ${nfModules.map((x) => x.name).join('; ')}`);
        }
    }

    sortednfModules.forEach((item) => {
        if (item.module.menu && item.module.menu instanceof Array) {
            nfMenuInfo.push(...item.module.menu);
        }
    });

    const menuStruct = { _items: [] };
    nfMenuInfo.forEach((item) => {
        const path = item.path ? item.path.split('/') : false;
        let node = menuStruct;
        if (item.form) {
            path && path.forEach((p) => {
                const [c, i, o, s] = p.split('$');
                node = node[c] = node[c] || { _items: [] };
                node._icon = i || node._icon;
                node._order = o || node._order;
                node._iconset = s || node._iconset;
            });
            node._items.push(item);
        } else {
            path && path.forEach((p) => {
                node = node[p] = node[p] || { _items: [] };
            });
            node = node[item.caption] = node[item.caption] || { _items: [] };
            node._icon = item.icon || node._icon;
            node._order = item.order || node._order;
            node._guid = item.guid || node._guid;
            node._iconset = item.iconset || node._iconset;
        }
    });

    let id = 0;
    const menu = [{
        id: ++id, pid: null, caption: 'Главное меню', form: '', icon: '', guid: ''
    }];
    const buildMenu = (structNode, pid) => {
        let levelItems = [];
        if (structNode._items) {
            levelItems = structNode._items;
            delete structNode._items;
        }
        Object.keys(structNode).forEach((k) => {
            levelItems.push({
                caption: k,
                order: structNode[k]._order,
                icon: structNode[k]._icon,
                form: '',
                guid: structNode[k]._guid,
                iconset: structNode[k]._iconset
            });
            delete structNode[k]._icon;
            delete structNode[k]._order;
            delete structNode[k]._guid;
            delete structNode[k]._iconset;
        });

        levelItems.sort((a, b) => (a.order || 0) - (b.order || 0));

        levelItems.forEach((item) => {
            menu.push({ id: ++id, pid: pid, ...item });
            if (structNode[item.caption]) {
                buildMenu(structNode[item.caption], id);
            }
        });
    };

    buildMenu(menuStruct, id);

    nfMenuInfo = menu;
    // построение глобального хранилища сообщений
    sortednfModules.forEach((mod) => {
        const { msgs } = mod.module;
        if (msgs) {
            Object.keys(msgs).forEach((namespace) => {
                nfMessages[namespace] = { ...nfMessages[namespace], ...msgs[namespace] };
            });
        }
    });
    sortedExtensions = sortednfModules;
    return sortednfModules;
}

/**
     * getFiles - ищет файлы по маске в активных расширениях с учетом их порядка
     * @param path
     * @param {Object} [options]
     * @param {boolean} [options.isDir]
     * @param {boolean} [options.onlyExt]
     * @param {String} [options.rootDir]
     * @param {Array<String>} [options.extensions]
     * @param {boolean} [options.invert]
     * @param {boolean} [options.onlyFiles]
     * @param {boolean} [options.rich]
     * @param {boolean} [options.resArray]
     * @returns {Promise<[]|boolean>|String}
     */
async function getFiles(path, options) {
    options = { ...extensionFileDefaults, ...options };
    const ap = (options.rootDir === false) ? process.cwd().replace(/\\/g, '/') : options.rootDir;
    let resFiles = [];

    async function handler(path) {
        const files = await glob(path, { onlyDirectories: options.isDir, markDirectories: true, onlyFiles: options.onlyFiles });

        if (!files) { return []; }
        const res = [];
        for (let i = 0, n = files.length; i < n; i++) {
            const filepath = files[i];
            res.push(filepath);
        }
        return res;
    }
    const exts = options.extensions || sortedExtensions.map((ext) => ext.name);
    for (let i = 0, c = exts.length; i < c; i++) {
        const ext = exts[(options.invert) ? c - 1 - i : i];
        const searchPath = `${extensionsPath + ext}/${path}`;

        const extfiles = await handler(searchPath);
        if (extfiles && extfiles.length > 0) {
            resFiles = resFiles.concat(options.rich ? extfiles.map((p) => ({ path: p, extension: ext })) : extfiles);
        }
    }

    if (!options.onlyExt) {
        const files = await handler(`${ap}/${path}`);
        if (files && files.length > 0) {
            resFiles = resFiles.concat(options.rich ? files.map((p) => ({ path: p, extension: '_app_' })) : files);
        }
    }

    if (options.invert) resFiles.reverse();

    if (resFiles.length > 0 && !options.resArray) { return resFiles.pop(); }

    return options.resArray ? resFiles : false;
}

function getSortedExtensions() {
    return sortedExtensions;
}

function getExtensions(name) {
    if (name) {
        return sortedExtensions.find((m) => m.name === name);
    }
    return sortedExtensions;
}

function getExtensionsMetaByName(name, extension) {
    if(extension) {
        return sortedExtensions.find((m) => m.name === extension).meta[name];
    }
    return sortedExtensions.map(x => x?.meta[name]).filter(x => x);
}

export {
    load,
    getFiles,
    getSortedExtensions,
    getExtensionsMetaByName,
    getExtensions,
    nfMenuInfo as menuInfo,
    nfMessages
};
