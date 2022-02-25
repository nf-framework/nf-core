import path from "path";
import dotenv from "dotenv";
import minimist from "minimist";
import api from "./api/index.js";
import * as extension from "./api/extension.js";
import { Container } from "./api/container.js";

const iterate = (obj) => {
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object'){
            if (obj[key]) iterate(obj[key])
        }
        else{
            let val = String(obj[key]);
            let a = val.match(/{{\w+}}/g);
            let asString = false;
            if (a){
                a.forEach((el) => {
                    let s  = el.replace(/{{|}}/gi, '');
                    if (process.env[s]){
                        let envVal = String(process.env[s]).replace(/^~/,'');
                        if (envVal.length !== String(process.env[s]).length) asString = true;
                        let rgx = new RegExp('{{'+ s +'}}','gi');
                        val = val.replace(rgx, envVal);
                    }
                })
                if (asString) obj[key] = val;
                else if (!isNaN(val)) obj[key] = +val;
                else if (val.toUpperCase() === 'TRUE') obj[key] = true;
                else if (val.toUpperCase() === 'FALSE') obj[key] = false;
                else obj[key] = val;
            }
        }
    })
}

// считывание параметров командной строки запуска
/**
 * @type {object} - аргументы командной строки
 * @property {string} configpath? - путь к файлу конфигурации
 */
const argv = minimist(process.argv.slice(2));

const configFile = argv.config ?? 'config.json';
let config_path = (path.isAbsolute(configFile)) ? configFile : path.join(process.cwd(), configFile).replace(/\\/g, '/');

const config = await api.loadJSON(config_path);
const packageJson = await api.loadJSON(path.join(process.cwd(), 'package.json').replace(/\\/g, '/'));
dotenv.config();
iterate(config);

api.argv = argv;
const container = new Container();
// по-умолчанию
container.service('logger', () => console);

/**
 * Запуск всего приложения
 * @return {Promise<void>}
 */
async function start() {
    const extensions = await extension.load();
    for (let i = 0, n = extensions.length; i < n; i++) {
        const module = extensions[i].module;
        if (module && module.init) {
            try {
                await module.init();
            } catch (e) {
                console.log(`Модуль ${extensions[i].name} не смог инициализироваться из-за [${e.stack}]`);
                const { ignoreModuleInitExceptions = false } = config;
                if (!ignoreModuleInitExceptions) {
                    console.log(`Приложение будет остановлено.`);
                    process.exit(1);
                }
            }
        } else {
            console.log(`Модуль ${extensions[i].name} не экспортирует функцию init`);
        }
    }
}

const { pm_id, name, SESSIONNAME, APPLICATION_NAME } = process.env;
const instanceName = (pm_id) ? `${name}[${pm_id}]` : SESSIONNAME;
const applicationName = APPLICATION_NAME || packageJson.name;

export { start, container, config, packageJson, api, instanceName, applicationName };
export * as errors from './api/errors.js';
export * as debug from './api/debug.js';
export * as common from './api/common.js';
export * as extension from './api/extension.js';
export * as message from './api/message.js';
