/**
 * Column - Класс колонки таблицы
 */
export class Column {
    /**
     * @param {Object} config - Конфигурация колонки
     */
    constructor(config = {}) {
        this._config = this._mergeDefaults(config);
        this._visible = !this._config.hidden;
        this._width = this._config.width;
        this._index = 0;
    }

    /**
     * Конфигурация по умолчанию
     */
    _getDefaults() {
        return {
            field: '',
            title: '',
            width: null,
            minWidth: 20,
            maxWidth: null,
            sortable: true,
            filterable: true,
            groupable: true,
            resizable: true,
            reorderable: true,
            locked: false,
            hidden: false,
            editable: false,
            template: null,
            editor: null,
            format: null,
            attributes: {},
            headerAttributes: {},
            footerTemplate: null,
            aggregates: [],
            columns: null // для групп колонок
        };
    }

    /**
     * Слияние с дефолтами
     */
    _mergeDefaults(config) {
        const defaults = this._getDefaults();
        return { ...defaults, ...config };
    }

    /**
     * Получение значения по полю
     * @param {string} prop
     * @returns {*}
     */
    get(prop) {
        return this._config[prop];
    }

    /**
     * Установка значения
     * @param {string} prop
     * @param {*} value
     */
    set(prop, value) {
        if (this._config.hasOwnProperty(prop)) {
            this._config[prop] = value;
        }
    }

    /**
     * Получение пути к данным (field может быть "a.b.c")
     * @returns {string}
     */
    get field() {
        return this._config.field;
    }

    /**
     * Заголовок колонки
     * @returns {string}
     */
    get title() {
        return this._config.title;
    }

    /**
     * Ширина колонки
     * @returns {number|null}
     */
    get width() {
        return this._width;
    }

    /**
     * Установка ширины
     * @param {number} value
     */
    set width(value) {
        const min = this._config.minWidth || 20;
        const max = this._config.maxWidth || Infinity;
        this._width = Math.max(min, Math.min(max, value));
    }

    /**
     * Видимость колонки
     * @returns {boolean}
     */
    get visible() {
        return this._visible;
    }

    /**
     * Установка видимости
     * @param {boolean} value
     */
    set visible(value) {
        this._visible = !!value;
    }

    /**
     * Порядковый индекс
     * @returns {number}
     */
    get index() {
        return this._index;
    }

    /**
     * Установка индекса
     * @param {number} value
     */
    set index(value) {
        this._index = value;
    }

    /**
     * Является ли группой колонок
     * @returns {boolean}
     */
    get isGroup() {
        return Array.isArray(this._config.columns) && this._config.columns.length > 0;
    }

    /**
     * Дочерние колонки (для групп)
     * @returns {Column[]}
     */
    get columns() {
        if (!this.isGroup) return [];
        return this._config.columns.map(c => c instanceof Column ? c : new Column(c));
    }

    /**
     * Получение значения из строки данных
     * @param {Object} dataItem
     * @returns {*}
     */
    getValue(dataItem) {
        if (!this.field || !dataItem) return undefined;

        const parts = this.field.split('.');
        let value = dataItem;

        for (const part of parts) {
            if (value === null || value === undefined) return undefined;
            value = value[part];
        }

        return value;
    }

    /**
     * Установка значения в строку данных
     * @param {Object} dataItem
     * @param {*} value
     */
    setValue(dataItem, value) {
        if (!this.field || !dataItem) return;

        const parts = this.field.split('.');
        let obj = dataItem;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') {
                obj[parts[i]] = {};
            }
            obj = obj[parts[i]];
        }

        obj[parts[parts.length - 1]] = value;
    }

    /**
     * Рендеринг значения (с учетом шаблона и формата)
     * @param {*} value
     * @param {Object} dataItem
     * @returns {string}
     */
    render(value, dataItem) {
        if (this._config.template) {
            return this._config.template(dataItem);
        }

        if (this._config.format && value !== null && value !== undefined) {
            return this._formatValue(value, this._config.format);
        }

        return value !== null && value !== undefined ? String(value) : '';
    }

    /**
     * Форматирование значения
     * @param {*} value
     * @param {string} format
     * @returns {string}
     */
    _formatValue(value, format) {
        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        if (value instanceof Date) {
            return value.toLocaleDateString();
        }

        return String(value);
    }

    /**
     * Сериализация в объект
     * @returns {Object}
     */
    toJSON() {
        return { ...this._config };
    }
}
