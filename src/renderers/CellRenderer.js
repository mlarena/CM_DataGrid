/**
 * CellRenderer - Рендеринг ячеек данных
 */
export class CellRenderer {
    /**
     * @param {Object} options - Опции рендерера
     */
    constructor(options = {}) {
        this._options = {
            altRowClass: 'cm-grid-row-alt',
            selectedRowClass: 'cm-grid-row-selected',
            hoverRowClass: 'cm-grid-row-hover',
            editingClass: 'cm-grid-cell-editing',
            ...options
        };
    }

    /**
     * Рендеринг строки
     * @param {Object} dataItem - Данные строки
     * @param {Column[]} columns - Колонки
     * @param {number} rowIndex - Индекс строки
     * @param {Object} state - Состояние (выборка, редактирование)
     * @returns {HTMLElement}
     */
    renderRow(dataItem, columns, rowIndex, state = {}) {
        const tr = document.createElement('tr');
        tr.classList.add('cm-grid-row');
        tr.dataset.rowIndex = rowIndex;
        tr.dataset.id = dataItem.id || rowIndex;

        // Чередование строк
        if (rowIndex % 2 === 1) {
            tr.classList.add(this._options.altRowClass);
        }

        // Выбранная строка
        if (state.selected && state.selected.includes(dataItem)) {
            tr.classList.add(this._options.selectedRowClass);
            tr.setAttribute('aria-selected', 'true');
        }

        // Рендерим ячейки
        columns.forEach(col => {
            if (col.isGroup) {
                col.columns.forEach(child => {
                    tr.appendChild(this.renderCell(dataItem, child, rowIndex, state));
                });
            } else {
                tr.appendChild(this.renderCell(dataItem, col, rowIndex, state));
            }
        });

        return tr;
    }

    /**
     * Рендеринг ячейки
     * @param {Object} dataItem - Данные строки
     * @param {Column} column - Колонка
     * @param {number} rowIndex - Индекс строки
     * @param {Object} state - Состояние
     * @returns {HTMLElement}
     */
    renderCell(dataItem, column, rowIndex, state = {}) {
        const td = document.createElement('td');
        td.classList.add('cm-grid-cell');
        td.dataset.field = column.field;

        // Получаем и рендерим значение
        const value = column.getValue(dataItem);
        const rendered = column.render(value, dataItem);
        td.innerHTML = rendered;

        // Атрибуты ячейки
        const attrs = column.get('attributes') || {};
        Object.entries(attrs).forEach(([key, val]) => {
            td.setAttribute(key, val);
        });

        // Редактируемая ячейка
        if (column.get('editable') && state.editing) {
            td.classList.add(this._options.editingClass);
        }

        return td;
    }

    /**
     * Рендеринг пустого состояния
     * @param {number} colspan - Количество колонок
     * @param {string} message - Сообщение
     * @returns {string}
     */
    renderEmpty(colspan, message = 'Нет данных') {
        return `
            <tr class="cm-grid-empty-row">
                <td colspan="${colspan}" class="cm-grid-empty-cell">
                    <div class="cm-grid-empty-message">${message}</div>
                </td>
            </tr>
        `;
    }

    /**
     * Рендеринг строки заголовка группы
     * @param {Object} groupData - Данные группы
     * @param {number} colspan - Количество колонок
     * @returns {string}
     */
    renderGroupHeader(groupData, colspan) {
        const { field, value, count } = groupData;
        return `
            <tr class="cm-grid-group-header">
                <td colspan="${colspan}" class="cm-grid-group-header-cell">
                    <span class="cm-grid-group-expand-icon">▶</span>
                    <span class="cm-grid-group-field">${field}:</span>
                    <span class="cm-grid-group-value">${value}</span>
                    <span class="cm-grid-group-count">(${count})</span>
                </td>
            </tr>
        `;
    }

    /**
     * Рендеринг строки футера группы
     * @param {Object} aggregates - Агрегаты
     * @param {number} colspan - Количество колонок
     * @returns {string}
     */
    renderGroupFooter(aggregates, colspan) {
        const cells = Object.entries(aggregates)
            .map(([field, value]) => `<td class="cm-grid-group-footer-cell">${value}</td>`)
            .join('');

        return `
            <tr class="cm-grid-group-footer">
                <td colspan="${colspan}" class="cm-grid-group-footer-cell">Итого:</td>
                ${cells}
            </tr>
        `;
    }
}
