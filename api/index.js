import fs from "fs/promises";
import path from "path";
import glob from "fast-glob";
import {config} from "../index.js";
import {NFError, NFUnauthorizedError} from "./errors.js"


let nfMenuInfo = [];
const hooks = {};


let appRoutes = {};

class Api {

    static argv;

    static get_option(name, defaultValue) {
        return config[name] || defaultValue;
    }

    static get tempDir() {
        return this.get_option('temp_dir', `${process.cwd().replace(/\\/g, '/')}/temp`);
    }

    static get theme() {
        return this.get_option('theme', 'default');
    }

    static async getWorkspaces() {
        const rootPackage = await this.getRootPackageInfo();
        const packages = [];

        for (let i = 0; i < rootPackage.workspaces.length; i++) {
            const paths = await glob(path.join(process.cwd(), rootPackage.workspaces[i]).replace(/\\/g, '/'), {
                cwd: process.cwd().replace(/\\/g, '/'),
                onlyDirectories: true
            });

            const workspaceName = rootPackage.workspaces[i].replace('/*', '/');
            paths.forEach((dirPath) => {
                const pkgPath = dirPath.slice(dirPath.indexOf(workspaceName));
                packages.push({
                    fullpath: dirPath,
                    path: pkgPath,
                    moduleName: pkgPath.replace(workspaceName, '').replace('/', '')
                });
            });
        }

        return packages;
    }

    static async getGitWorkspaces() {
        const rootPackage = await this.getRootPackageInfo();
        const packages = [];

        for (let i = 0; i < rootPackage.workspaces.length; i++) {
            const paths = await glob(path.join(process.cwd(), rootPackage.workspaces[i], '.git').replace(/\\/g, '/'), {
                cwd: process.cwd().replace(/\\/g, '/'),
                onlyDirectories: true
            });

            const workspaceName = rootPackage.workspaces[i].replace('/*', '/');
            paths.forEach((gitDirPath) => {
                const fullpath = gitDirPath.replace('.git', '');
                const pkgPath = fullpath.slice(fullpath.indexOf(workspaceName));
                packages.push({
                    fullpath: fullpath,
                    path: pkgPath,
                    moduleName: pkgPath.replace(workspaceName, '').replace('/', '')
                });
            });
        }

        const rootGit = await glob(path.join(process.cwd(), '.git').replace(/\\/g, '/'), {
            cwd: process.cwd().replace(/\\/g, '/'),
            onlyDirectories: true
        });
        if (rootGit.length > 0) {
            packages.push({
                fullpath: process.cwd().replace(/\\/g, '/'),
                path: rootPackage.name + '/'
            });
        }

        return packages;
    }


    static async getRootPackageInfo() {
        const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json').replace(/\\/g, '/'), 'utf-8'));
        return {
            name: packageJson.name,
            description: packageJson.description,
            version: packageJson.version,
            workspaces: packageJson.workspaces
        };
    }

    static async isExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch (err) {
            return false;
        }
    }

    static async isDirectory(path) {
        const stat = await fs.lstat(path);
        return stat.isDirectory();
    }

    static registerModuleComponent(name, type, path) {
        config.components = config.components || {};

        config.components[name] = {
            type: type,
            path: path,
        };
    }

    static getModuleComponent(name) {
        config.components = config.components || {};

        return config.components[name];
    }

    static setAppRoute(route, path) {
        if (!appRoutes[route]) { appRoutes[route] = { path: path, middlewares: [] }; }
    }

    /**
     * Создание и редактирование именованного хранилища для массива обработчиков маршрута, чтобы динамически подключать
     * обработчики на один маршрут. Используется когда подключаемые модули хотят участвовать в цепочке обработки маршрута,
     * прерывая обработки и отдавая результат либо вносить какие-либо изменения и продолжать цепочку
     *
     * @route мета имя маршрута
     * @middleware функция обработчика
     * @order порядок, в котором будут применяться обработчики
     */
    static setAppRouteMid(route, middleware, order) {
        if (!appRoutes[route]) { appRoutes[route] = []; }
        appRoutes[route].push({ func: middleware, order: order });
    }

    static async execAppRoute2(context, route) {
        const funcs = appRoutes[route]
            .sort((a, b) => a.order - b.order)
            .map(v => v.func);

        for ( let f of funcs) {
            await f(context);
        }
    }

    /**
     * Последовательное выполнение цепочки обработчиков маршрута, отсортированные по order. Пример использования :
     * nf.app.post(/^\/action\/(.+)/, function(req,res,next){nf.api.execAppRoute(req,res,next,'action')});
     *
     * @param req
     * @param res
     * @param next
     * @param route мета имя маршрута
     */
    static execAppRoute(req, res, next, route) {
        const funcs = appRoutes[route]
            .sort((a, b) => a.order - b.order)
            .map(v => v.func);

        function run(index = 0) {
            let i = index;
            if (i < funcs.length) {
                funcs[i](req, res, (err) => {
                    if (err) {
                        return next(err);
                    }
                    i += 1;
                    return run(i);
                });
            } else {
                next();
            }
        }

        run();
    }

    static nfError(error, message, detail) {
        let err;
        if (error instanceof NFError) {
            err = error;
            if (message) {
                err.stackPush(err.message, err.detail, err.stack);
                err.setMessage(message);
                err.setDetail(detail);
            }
        } else {
            if (message) {
                err = new NFError(message);
                if (error) {
                    err.stackPush(error.message, Object.assign({}, error), error.stack);
                }
            } else {
                err = new NFError();
                Object.assign(err, error);
                err.message = error.message;
                err.stack = error.stack;
            }
            err.setDetail(detail);
        }
        return err;
    }
    /** @deprecated */
    static setRouteMap(route, path, options) {
        this.routeMap = this.routeMap || {};

        this.routeMap[route] = { path, options };
    }
    /** @deprecated */
    static getRouteMap(route) {
        //TODO: добавить кеширование
        if(!this.routeMap) return false;
        let l = 0;
        let fRoute = false;
        let full = false;
        Object.keys(this.routeMap).find( r => {
            if (route === r) {
                full = true;
                fRoute = r;
                return true;
            }
            if( route.indexOf(r+'/') === 0 && l < r.length ){
                fRoute = r;
            }
        });

        return fRoute !== false && {...this.routeMap[fRoute], params: full?undefined:[fRoute, route.replace(fRoute,'')]};
    }

    /**
     * Загрузка JSON файла
     * @param path
     * @returns {Promise<any>}
     */
    static async loadJSON(path) {
        return JSON.parse(await fs.readFile(path, 'utf8'));
    }

    /**
     * Добавляет в список хуков функцию по указанному имени, список сортируется в соответствии с параметром order.
     * Если order не указан то такие функции будут выполнены в конце. Для одинакового order порядок не гарантирован.
     * @param {String} name - Имя цепочки
     * @param {Function} func - Функция
     * @param {Number} order? - Порядок выполнения
     */
    static addHook(name,func,order) {
        let h = hooks[name];
        if (!h) { h = [];  hooks[name] = h; }
        h.push({func,order});
        h.sort( (a,b) => a.order-b.order );
    }

    /**
     * Выполняет цепочку асинхронных хуков
     * @param {String} name - Имя цепочки
     * @param {Object} self? - Объект используемый в качестве this
     * @param args - Аргументы для вызова функций
     * @returns {Promise<void>}
     */
    static async processHooks(name, self, ...args) {
        let h = hooks[name];
        if (h) {
            for( let i of h ) {
                await i.func.apply(self,args);
            }
        }
    }

    /**
     * Выполняет цепочку синхронных хуков
     * @param {String} name - Имя цепочки
     * @param {Object} self? - Объект используемый в качестве this
     * @param args - Аргументы для вызова функций
     * @returns {void}
     */
    static processSyncHooks(name, self, ...args) {
        hooks[name]?.forEach( i => i.func.apply(self,args));
    }

    static get menuInfo() {
        return nfMenuInfo;
    }
}

export default Api;


