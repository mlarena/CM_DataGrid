import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Sorting - Модуль сортировки
 */
export class Sorting extends EventEmitter {
    /**
     * @param {Object} options - Конфигурация сортировки
     */
    constructor(options = {}) {
        super();

        this._options = {
            mode: 'single', // 'single' или 'multiple'
            allowUnsort: true,
            showIndexes: true,
            initial: [],
            ...options
        };

        this._sort = [...(this._options.initial || [])];
    }

    /**
     * Рендеринг индикаторов сортировки
     * @param {HTMLElement} headerCell - Ячейка заголовка
     * @param {string} field - Поле колонки
     */
    renderIndicator(headerCell, field) {
        const sortItem = this._sort.find(s => s.field === field);
        const icon = headerCell.querySelector('.cm-grid-sort-icon');

        if (!icon) return;

        // Удаляем предыдущие классы
        headerCell.classList.remove('cm-grid-sort-asc', 'cm-grid-sort-desc', 'cm-grid-sort-index');

        if (sortItem) {
            headerCell.classList.add(`cm-grid-sort-${sortItem.dir}`);

            // Индекс для многоколоночной сортировки
            if (this._options.mode === 'multiple' && this._options.showIndexes) {
                const index = this._sort.indexOf(sortItem) + 1;
                headerCell.classList.add('cm-grid-sort-index');
                icon.dataset.index = index;
            }
        }
    }

    /**
     * Обработка клика по заголовку
     * @param {string} field - Поле колонки
     * @param {boolean} isCtrl - Нажат Ctrl/Cmd
     * @returns {Array} Новая сортировка
     */
    handleHeaderClick(field, isCtrl = false) {
        const existingIndex = this._sort.findIndex(s => s.field === field);

        if (this._options.mode === 'single' && !isCtrl) {
            // Одноколоночная сортировка
            return this._singleSort(field);
        } else {
            // Многоколоночная сортировка
            return this._multipleSort(field, isCtrl);
        }
    }

    /**
     * Одноколоночная сортировка
     */
    _singleSort(field) {
        const existing = this._sort.find(s => s.field === field);

        if (existing) {
            if (existing.dir === 'asc') {
                // Переключаем на убывание
                this._sort = [{ field, dir: 'desc' }];
            } else if (this._options.allowUnsort) {
                // Убираем сортировку
                this._sort = [];
            } else {
                // Возвращаем возрастание
                this._sort = [{ field, dir: 'asc' }];
            }
        } else {
            this._sort = [{ field, dir: 'asc' }];
        }

        this.trigger('sortChange', { sort: [...this._sort] });
        return [...this._sort];
    }

    /**
     * Многоколоночная сортировка
     */
    _multipleSort(field, isCtrl) {
        const existingIndex = this._sort.findIndex(s => s.field === field);

        if (existingIndex !== -1) {
            const existing = this._sort[existingIndex];

            if (existing.dir === 'asc') {
                // Переключаем на убывание
                this._sort[existingIndex] = { field, dir: 'desc' };
            } else if (this._options.allowUnsort) {
                // Убираем сортировку
                this._sort.splice(existingIndex, 1);
            } else {
                // Возвращаем возрастание
                this._sort[existingIndex] = { field, dir: 'asc' };
            }
        } else {
            // Добавляем новую сортировку
            this._sort.push({ field, dir: 'asc' });
        }

        this.trigger('sortChange', { sort: [...this._sort] });
        return [...this._sort];
    }

    /**
     * Установка сортировки
     * @param {Array} sort
     */
    setSort(sort) {
        this._sort = Array.isArray(sort) ? [...sort] : [];
        this.trigger('sortChange', { sort: [...this._sort] });
    }

    /**
     * Добавление сортировки
     * @param {string} field
     * @param {string} dir - 'asc' или 'desc'
     */
    addSort(field, dir = 'asc') {
        const existing = this._sort.findIndex(s => s.field === field);

        if (existing !== -1) {
            this._sort[existing] = { field, dir };
        } else {
            this._sort.push({ field, dir });
        }

        this.trigger('sortChange', { sort: [...this._sort] });
    }

    /**
     * Удаление сортировки по полю
     * @param {string} field
     */
    removeSort(field) {
        this._sort = this._sort.filter(s => s.field !== field);
        this.trigger('sortChange', { sort: [...this._sort] });
    }

    /**
     * Очистка сортировки
     */
    clearSort() {
        this._sort = [];
        this.trigger('sortChange', { sort: [] });
    }

    /**
     * Получение текущей сортировки
     * @returns {Array}
     */
    getSort() {
        return [...this._sort];
    }

    /**
     * Проверка, есть ли сортировка
     * @returns {boolean}
     */
    hasSort() {
        return this._sort.length > 0;
    }

    /**
     * Применение сортировки к данным
     * @param {Array} data
     * @returns {Array}
     */
    applySort(data) {
        if (!this._sort.length) return data;

        return [...data].sort((a, b) => {
            for (const s of this._sort) {
                const valueA = this._getValue(a, s.field);
                const valueB = this._getValue(b, s.field);

                let result = 0;

                if (valueA === null || valueA === undefined) result = -1;
                else if (valueB === null || valueB === undefined) result = 1;
                else if (valueA < valueB) result = -1;
                else if (valueA > valueB) result = 1;

                if (result !== 0) {
                    return s.dir === 'desc' ? -result : result;
                }
            }
            return 0;
        });
    }

    /**
     * Получение значения по пути
     */
    _getValue(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    /**
     * Получение CSS-класса для направления
     * @param {string} field
     * @returns {string|null}
     */
    getSortClass(field) {
        const sortItem = this._sort.find(s => s.field === field);
        return sortItem ? `cm-grid-sort-${sortItem.dir}` : null;
    }

    /**
     * Получение индекса сортировки
     * @param {string} field
     * @returns {number}
     */
    getSortIndex(field) {
        const index = this._sort.findIndex(s => s.field === field);
        return index !== -1 ? index + 1 : 0;
    }
}
