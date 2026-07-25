/**
 * EventEmitter - Система событий для CM Data Grid
 */
export class EventEmitter {
    constructor() {
        this._events = {};
    }

    /**
     * Подписка на событие
     * @param {string} event - Имя события
     * @param {Function} handler - Обработчик
     * @returns {EventEmitter}
     */
    on(event, handler) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(handler);
        return this;
    }

    /**
     * Одноразовая подписка
     * @param {string} event - Имя события
     * @param {Function} handler - Обработчик
     * @returns {EventEmitter}
     */
    once(event, handler) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            handler.apply(this, args);
        };
        wrapper._original = handler;
        return this.on(event, wrapper);
    }

    /**
     * Отписка от события
     * @param {string} event - Имя события
     * @param {Function} handler - Обработчик (если не указан - удаляются все)
     * @returns {EventEmitter}
     */
    off(event, handler) {
        if (!this._events[event]) {
            return this;
        }

        if (!handler) {
            delete this._events[event];
            return this;
        }

        this._events[event] = this._events[event].filter(
            h => h !== handler && h._original !== handler
        );

        if (this._events[event].length === 0) {
            delete this._events[event];
        }

        return this;
    }

    /**
     * Вызов события
     * @param {string} event - Имя события
     * @param {...*} args - Аргументы
     * @returns {boolean} false если обработчик вызвал preventDefault
     */
    trigger(event, ...args) {
        if (!this._events[event]) {
            return true;
        }

        const e = { type: event, preventDefault: () => false };
        let result = true;

        [...this._events[event]].forEach(handler => {
            const ret = handler.call(this, e, ...args);
            if (ret === false) {
                result = false;
            }
        });

        return result;
    }

    /**
     * Проверка наличия подписчиков
     * @param {string} event - Имя события
     * @returns {boolean}
     */
    hasListeners(event) {
        return !!(this._events[event] && this._events[event].length);
    }

    /**
     * Удаление всех подписчиков
     * @returns {EventEmitter}
     */
    destroy() {
        this._events = {};
        return this;
    }
}
