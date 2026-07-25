import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Paging - Модуль пагинации
 */
export class Paging extends EventEmitter {
    /**
     * @param {Object} options - Конфигурация пагинации
     */
    constructor(options = {}) {
        super();

        this._options = this._mergeDefaults(options);
        this._currentPage = 1;
        this._totalPages = 0;
        this._total = 0;
        this._container = null;
    }

    /**
     * Конфигурация по умолчанию
     */
    _getDefaults() {
        return {
            pageSize: 20,
            pageSizes: [10, 20, 50, 100],
            buttonCount: 5,
            info: true,
            numeric: true,
            previousNext: true,
            refresh: false,
            messages: {
                display: 'Записи {0}-{1} из {2}',
                empty: 'Нет записей',
                page: 'Страница',
                of: 'из',
                itemsPerPage: 'записей на странице',
                first: 'Первая',
                previous: 'Предыдущая',
                next: 'Следующая',
                last: 'Последняя',
                refresh: 'Обновить'
            }
        };
    }

    /**
     * Слияние с дефолтами
     */
    _mergeDefaults(options) {
        return {
            ...this._getDefaults(),
            ...options,
            messages: { ...this._getDefaults().messages, ...(options.messages || {}) }
        };
    }

    /**
     * Рендеринг пагинации
     * @param {HTMLElement} container
     * @param {Object} state - { page, total, pageSize }
     */
    render(container, state) {
        this._container = container;
        this._currentPage = state.page || 1;
        this._total = state.total || 0;
        this._totalPages = Math.ceil(this._total / (state.pageSize || this._options.pageSize));

        if (this._totalPages <= 1 && !this._options.info) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this._getHTML();
        this._bindEvents();
    }

    /**
     * Генерация HTML
     */
    _getHTML() {
        const msgs = this._options.messages;

        if (this._total === 0) {
            return `<div class="cm-grid-pager">
                <span class="cm-grid-pager-info">${msgs.empty}</span>
            </div>`;
        }

        const start = (this._currentPage - 1) * this._getPageSize() + 1;
        const end = Math.min(start + this._getPageSize() - 1, this._total);

        let html = '<div class="cm-grid-pager">';

        // Информация
        if (this._options.info) {
            html += `<div class="cm-grid-pager-info">
                ${msgs.display.replace('{0}', start).replace('{1}', end).replace('{2}', this._total)}
            </div>`;
        }

        // Кнопки навигации
        html += '<div class="cm-grid-pager-buttons">';

        if (this._options.previousNext) {
            html += this._renderButton('first', msgs.first, '«');
            html += this._renderButton('prev', msgs.previous, '‹');
        }

        if (this._options.numeric) {
            html += this._renderPageButtons();
        }

        if (this._options.previousNext) {
            html += this._renderButton('next', msgs.next, '›');
            html += this._renderButton('last', msgs.last, '»');
        }

        html += '</div>';

        // Выбор размера страницы
        if (this._options.pageSizes && this._options.pageSizes.length) {
            html += this._renderPageSizeSelector();
        }

        // Кнопка обновления
        if (this._options.refresh) {
            html += `<div class="cm-grid-pager-refresh">
                <button class="cm-grid-pager-btn cm-grid-pager-refresh-btn" 
                        title="${msgs.refresh}">↻</button>
            </div>`;
        }

        html += '</div>';

        return html;
    }

    /**
     * Рендеринг кнопки
     */
    _renderButton(action, title, label) {
        const disabled = this._isDisabled(action);
        return `<button class="cm-grid-pager-btn cm-grid-pager-btn-${action}" 
                        data-action="${action}"
                        title="${title}"
                        ${disabled ? 'disabled' : ''}>${label}</button>`;
    }

    /**
     * Рендеринг кнопок страниц
     */
    _renderPageButtons() {
        let html = '';
        const pages = this._getPageRange();

        pages.forEach(page => {
            if (page === '...') {
                html += '<span class="cm-grid-pager-ellipsis">...</span>';
            } else {
                const active = page === this._currentPage ? 'active' : '';
                html += `<button class="cm-grid-pager-btn cm-grid-pager-page ${active}" 
                                data-page="${page}">${page}</button>`;
            }
        });

        return html;
    }

    /**
     * Получение диапазона страниц
     */
    _getPageRange() {
        const total = this._totalPages;
        const current = this._currentPage;
        const count = this._options.buttonCount;

        if (total <= count) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [];
        let start = Math.max(1, current - Math.floor(count / 2));
        let end = Math.min(total, start + count - 1);

        if (end - start < count - 1) {
            start = Math.max(1, end - count + 1);
        }

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < total) {
            if (end < total - 1) pages.push('...');
            pages.push(total);
        }

        return pages;
    }

    /**
     * Рендеринг селектора размера страницы
     */
    _renderPageSizeSelector() {
        const currentSize = this._getPageSize();
        const options = this._options.pageSizes
            .map(size => `<option value="${size}" ${size === currentSize ? 'selected' : ''}>${size}</option>`)
            .join('');

        return `<div class="cm-grid-pager-sizes">
            <select class="cm-grid-pager-size-select">${options}</select>
            <span class="cm-grid-pager-size-label">${this._options.messages.itemsPerPage}</span>
        </div>`;
    }

    /**
     * Проверка, отключена ли кнопка
     */
    _isDisabled(action) {
        switch (action) {
            case 'first':
            case 'prev':
                return this._currentPage <= 1;
            case 'next':
            case 'last':
                return this._currentPage >= this._totalPages;
            default:
                return false;
        }
    }

    /**
     * Получение текущего размера страницы
     */
    _getPageSize() {
        return this._options.pageSize;
    }

    /**
     * Привязка событий
     */
    _bindEvents() {
        if (!this._container) return;

        // Кнопки навигации
        this._container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this._handleAction(action);
            });
        });

        // Кнопки страниц
        this._container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                if (!isNaN(page)) {
                    this._goToPage(page);
                }
            });
        });

        // Выбор размера страницы
        const sizeSelect = this._container.querySelector('.cm-grid-pager-size-select');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                const size = parseInt(e.target.value);
                if (!isNaN(size)) {
                    this._options.pageSize = size;
                    this.trigger('pageSizeChange', { pageSize: size });
                }
            });
        }

        // Кнопка обновления
        const refreshBtn = this._container.querySelector('.cm-grid-pager-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.trigger('refresh');
            });
        }
    }

    /**
     * Обработка действия
     */
    _handleAction(action) {
        switch (action) {
            case 'first':
                this._goToPage(1);
                break;
            case 'prev':
                this._goToPage(this._currentPage - 1);
                break;
            case 'next':
                this._goToPage(this._currentPage + 1);
                break;
            case 'last':
                this._goToPage(this._totalPages);
                break;
        }
    }

    /**
     * Переход на страницу
     */
    _goToPage(page) {
        if (page < 1 || page > this._totalPages || page === this._currentPage) {
            return;
        }

        this._currentPage = page;
        this.trigger('pageChange', { page, pageSize: this._getPageSize() });
    }

    /**
     * Текущая страница
     * @returns {number}
     */
    get currentPage() {
        return this._currentPage;
    }

    /**
     * Общее количество страниц
     * @returns {number}
     */
    get totalPages() {
        return this._totalPages;
    }

    /**
     * Установка опций
     * @param {Object} options
     */
    setOptions(options) {
        this._options = { ...this._options, ...options };
    }
}
