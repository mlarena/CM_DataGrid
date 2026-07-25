import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * DataSource - Управление данными таблицы
 */
export class DataSource extends EventEmitter {
    /**
     * @param {Object} config - Конфигурация источника данных
     */
    constructor(config = {}) {
        super();
        this._config = this._mergeDefaults(config);
        this._data = [];
        this._total = 0;
        this._page = 1;
        this._pageSize = this._config.pageSize || 20;
        this._sort = this._config.sort ? [...this._config.sort] : [];
        this._filter = this._config.filter || null;
        this._group = this._config.group ? [...this._config.group] : [];
        this._aggregates = this._config.aggregates ? [...this._config.aggregates] : [];
        this._pendingChanges = { created: [], updated: [], destroyed: [] };
    }

    /**
     * Конфигурация по умолчанию
     */
    _getDefaults() {
        return {
            data: [],
            transport: null,
            schema: {
                data: 'data',
                total: 'total',
                model: {
                    id: 'id',
                    fields: {}
                }
            },
            pageSize: 20,
            serverPaging: false,
            serverSorting: false,
            serverFiltering: false,
            serverGrouping: false,
            sort: [],
            filter: null,
            group: [],
            aggregates: []
        };
    }

    /**
     * Слияние с дефолтами
     */
    _mergeDefaults(config) {
        const defaults = this._getDefaults();
        return {
            ...defaults,
            ...config,
            schema: { ...defaults.schema, ...(config.schema || {}) }
        };
    }

    /**
     * Загрузка данных
     * @returns {Promise}
     */
    async read() {
        this.trigger('beforeRead');

        try {
            if (this._config.transport && this._config.transport.read) {
                await this._fetchRemote();
            } else {
                this._data = this._config.data ? [...this._config.data] : [];
                this._total = this._data.length;
            }

            this.trigger('afterRead', { data: this._data, total: this._total });
            return this._data;
        } catch (error) {
            this.trigger('error', { error, operation: 'read' });
            throw error;
        }
    }

    /**
     * Загрузка с сервера
     */
    async _fetchRemote() {
        const transport = this._config.transport.read;
        const params = { ...transport.data };

        if (this._config.serverPaging) {
            params.page = this._page;
            params.pageSize = this._pageSize;
        }

        if (this._config.serverSorting && this._sort.length) {
            params.sort = this._sort;
        }

        if (this._config.serverFiltering && this._filter) {
            params.filter = this._filter;
        }

        const response = await fetch(transport.url, {
            method: transport.type || 'GET',
            headers: transport.headers || {},
            body: transport.type !== 'GET' ? JSON.stringify(params) : undefined
        });

        const result = await response.json();
        const schema = this._config.schema;

        this._data = this._getNestedValue(result, schema.data) || [];
        this._total = this._getNestedValue(result, schema.total) || this._data.length;
    }

    /**
     * Получение вложенного значения по пути
     */
    _getNestedValue(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    /**
     * Добавление записи
     * @param {Object} dataItem
     * @returns {Object}
     */
    add(dataItem) {
        const id = this._generateId();
        const item = { ...dataItem };

        if (!item.id) {
            item.id = id;
        }

        this._data.push(item);
        this._pendingChanges.created.push(item);
        this._total++;

        this.trigger('add', { dataItem: item });
        return item;
    }

    /**
     * Удаление записи
     * @param {Object} dataItem
     * @returns {boolean}
     */
    remove(dataItem) {
        const index = this._data.indexOf(dataItem);
        if (index === -1) return false;

        this._data.splice(index, 1);
        this._pendingChanges.destroyed.push(dataItem);
        this._total--;

        this.trigger('remove', { dataItem });
        return true;
    }

    /**
     * Обновление записи
     * @param {Object} dataItem
     * @param {Object} changes
     * @returns {Object}
     */
    update(dataItem, changes) {
        const index = this._data.indexOf(dataItem);
        if (index === -1) return null;

        const updated = { ...dataItem, ...changes };
        this._data[index] = updated;
        this._pendingChanges.updated.push(updated);

        this.trigger('update', { dataItem: updated, originalData: dataItem });
        return updated;
    }

    /**
     * Синхронизация изменений с сервером
     * @returns {Promise}
     */
    async sync() {
        if (!this._config.transport) return;

        const { created, updated, destroyed } = this._pendingChanges;

        try {
            if (created.length && this._config.transport.create) {
                await this._syncBatch('create', created);
            }
            if (updated.length && this._config.transport.update) {
                await this._syncBatch('update', updated);
            }
            if (destroyed.length && this._config.transport.destroy) {
                await this._syncBatch('destroy', destroyed);
            }

            this._pendingChanges = { created: [], updated: [], destroyed: [] };
            this.trigger('sync');
        } catch (error) {
            this.trigger('error', { error, operation: 'sync' });
            throw error;
        }
    }

    /**
     * Пакетная синхронизация
     */
    async _syncBatch(operation, items) {
        const transport = this._config.transport[operation];
        const response = await fetch(transport.url, {
            method: transport.type || 'POST',
            headers: { 'Content-Type': 'application/json', ...transport.headers },
            body: JSON.stringify(items)
        });
        return response.json();
    }

    /**
     * Генерация уникального ID
     */
    _generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Общее количество записей
     * @returns {number}
     */
    total() {
        return this._total;
    }

    /**
     * Текущее представление данных (с учетом пагинации, сортировки, фильтров)
     * @returns {Array}
     */
    view() {
        let data = [...this._data];

        // Фильтрация (клиентская)
        if (!this._config.serverFiltering && this._filter) {
            data = this._applyFilter(data, this._filter);
        }

        // Сортировка (клиентская)
        if (!this._config.serverSorting && this._sort.length) {
            data = this._applySort(data, this._sort);
        }

        // Пагинация (клиентская)
        if (!this._config.serverPaging) {
            const start = (this._page - 1) * this._pageSize;
            data = data.slice(start, start + this._pageSize);
        }

        return data;
    }

    /**
     * Применение фильтра
     */
    _applyFilter(data, filter) {
        if (!filter || !filter.filters || !filter.filters.length) {
            return data;
        }

        const logic = (filter.logic || 'and').toLowerCase();

        return data.filter(item => {
            const results = filter.filters.map(f => {
                if (f.filters) {
                    return this._applyFilter([item], f).length > 0;
                }
                return this._evaluateFilter(item, f);
            });

            return logic === 'and'
                ? results.every(r => r)
                : results.some(r => r);
        });
    }

    /**
     * Оценка одного условия фильтра
     */
    _evaluateFilter(item, filter) {
        const value = this._getNestedValue(item, filter.field);
        const filterValue = filter.value;

        switch (filter.operator) {
            case 'eq': return value === filterValue;
            case 'neq': return value !== filterValue;
            case 'lt': return value < filterValue;
            case 'lte': return value <= filterValue;
            case 'gt': return value > filterValue;
            case 'gte': return value >= filterValue;
            case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'doesnotcontain': return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startswith': return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endswith': return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
            default: return true;
        }
    }

    /**
     * Применение сортировки
     */
    _applySort(data, sort) {
        if (!sort || !sort.length) return data;

        return [...data].sort((a, b) => {
            for (const s of sort) {
                const valueA = this._getNestedValue(a, s.field);
                const valueB = this._getNestedValue(b, s.field);

                let result = 0;

                if (valueA < valueB) result = -1;
                else if (valueA > valueB) result = 1;

                if (result !== 0) {
                    return s.dir === 'desc' ? -result : result;
                }
            }
            return 0;
        });
    }

    /**
     * Переход на страницу
     * @param {number} page
     */
    page(page) {
        const totalPages = Math.ceil(this._total / this._pageSize);
        this._page = Math.max(1, Math.min(page, totalPages));
        this.trigger('pageChange', { page: this._page, pageSize: this._pageSize });
    }

    /**
     * Текущая страница
     * @returns {number}
     */
    get currentPage() {
        return this._page;
    }

    /**
     * Количество страниц
     * @returns {number}
     */
    get totalPages() {
        return Math.ceil(this._total / this._pageSize);
    }

    /**
     * Установка сортировки
     * @param {Array} sort
     */
    sort(sort) {
        this._sort = Array.isArray(sort) ? [...sort] : [sort];
        this.trigger('sortChange', { sort: this._sort });
    }

    /**
     * Текущая сортировка
     * @returns {Array}
     */
    get currentSort() {
        return [...this._sort];
    }

    /**
     * Установка фильтра
     * @param {Object} filter
     */
    filter(filter) {
        this._filter = filter;
        this._page = 1; // Сброс на первую страницу
        this.trigger('filterChange', { filter: this._filter });
    }

    /**
     * Текущий фильтр
     * @returns {Object|null}
     */
    get currentFilter() {
        return this._filter;
    }

    /**
     * Установка группировки
     * @param {Array} group
     */
    group(group) {
        this._group = Array.isArray(group) ? [...group] : [group];
        this.trigger('groupChange', { group: this._group });
    }

    /**
     * Текущая группировка
     * @returns {Array}
     */
    get currentGroup() {
        return [...this._group];
    }

    /**
     * Размер страницы
     * @returns {number}
     */
    get pageSize() {
        return this._pageSize;
    }

    /**
     * Установка размера страницы
     * @param {number} size
     */
    set pageSize(size) {
        this._pageSize = size;
        this._page = 1;
        this.trigger('pageSizeChange', { pageSize: size });
    }

    /**
     * Получение всех данных (без пагинации)
     * @returns {Array}
     */
    all() {
        return [...this._data];
    }

    /**
     * Получение записи по ID
     * @param {*} id
     * @returns {Object|null}
     */
    getById(id) {
        const idField = this._config.schema.model.id;
        return this._data.find(item => item[idField] === id) || null;
    }

    /**
     * Уничтожение
     */
    destroy() {
        this._data = [];
        this._pendingChanges = { created: [], updated: [], destroyed: [] };
        super.destroy();
    }
}
