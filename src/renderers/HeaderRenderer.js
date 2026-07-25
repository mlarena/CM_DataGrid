/**
 * HeaderRenderer - Рендеринг заголовков таблицы
 */
export class HeaderRenderer {
    /**
     * @param {Object} options - Опции рендерера
     */
    constructor(options = {}) {
        this._options = {
            sortable: true,
            filterable: false,
            showSortIcons: true,
            ...options
        };
    }

    /**
     * Рендеринг заголовка
     * @param {Column[]} columns - Колонки
     * @param {Array} sort - Текущая сортировка
     * @returns {string}
     */
    render(columns, sort = []) {
        const hasGroups = columns.some(col => col.isGroup);
        let html = '';

        if (hasGroups) {
            html += this._renderGroupRow(columns);
        }

        html += this._renderColumnRow(columns, sort);

        return html;
    }

    /**
     * Рендеринг строки групп
     */
    _renderGroupRow(columns) {
        let html = '<tr class="cm-grid-header-group-row">';

        columns.forEach(col => {
            if (col.isGroup) {
                const colspan = this._countLeafColumns(col);
                html += `<th class="cm-grid-header-group" colspan="${colspan}" 
                            data-field="${col.field || ''}">${col.title}</th>`;
            } else {
                html += '<th class="cm-grid-header-spacer"></th>';
            }
        });

        html += '</tr>';
        return html;
    }

    /**
     * Подсчет количества колонок нижнего уровня
     */
    _countLeafColumns(column) {
        if (!column.isGroup) return 1;
        return column.columns.reduce((sum, col) => sum + this._countLeafColumns(col), 0);
    }

    /**
     * Рендеринг строки колонок
     */
    _renderColumnRow(columns, sort) {
        let html = '<tr class="cm-grid-header-row">';

        columns.forEach(col => {
            if (col.isGroup) {
                col.columns.forEach(child => {
                    html += this._renderCell(child, sort);
                });
            } else {
                html += this._renderCell(col, sort);
            }
        });

        html += '</tr>';
        return html;
    }

    /**
     * Рендеринг ячейки заголовка
     */
    _renderCell(column, sort) {
        const classes = ['cm-grid-header-cell'];
        const isSortable = column.get('sortable') !== false && this._options.sortable;
        const isFilterable = column.get('filterable') !== false && this._options.filterable;

        if (isSortable) {
            classes.push('cm-grid-sortable');
        }

        if (isFilterable) {
            classes.push('cm-grid-filterable');
        }

        // Определяем направление сортировки
        const sortItem = sort.find(s => s.field === column.field);
        if (sortItem) {
            classes.push(`cm-grid-sort-${sortItem.dir}`);
        }

        // Атрибуты заголовка
        const headerAttrs = column.get('headerAttributes') || {};
        const attrsStr = Object.entries(headerAttrs)
            .map(([key, val]) => `${key}="${val}"`)
            .join(' ');

        // Ширина
        const width = column.width;
        const widthAttr = width ? `style="width: ${width}px; min-width: ${column.get('minWidth') || 20}px;"` : '';

        // Значок сортировки
        const sortIcon = this._options.showSortIcons && isSortable
            ? '<span class="cm-grid-sort-icon"></span>'
            : '';

        return `
            <th class="${classes.join(' ')}" 
                data-field="${column.field}"
                ${widthAttr}
                ${attrsStr}>
                <span class="cm-grid-header-text">${column.title}</span>
                ${sortIcon}
            </th>
        `;
    }
}
