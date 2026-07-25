# CM Data Grid

Универсальный компонент таблицы данных на JavaScript/jQuery.

## Быстрый старт

### Подключение

```html
<!-- CSS -->
<link rel="stylesheet" href="dist/cm-data-grid.css">

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>

<!-- CM Data Grid -->
<script src="dist/cm-data-grid.js"></script>
```

### Базовое использование

```html
<div id="myGrid"></div>

<script>
$('#myGrid').cmDataGrid({
    dataSource: [
        { id: 1, name: 'Иван', age: 28 },
        { id: 2, name: 'Мария', age: 34 }
    ],
    columns: [
        { field: 'id', title: 'ID', width: 60 },
        { field: 'name', title: 'Имя', width: 200 },
        { field: 'age', title: 'Возраст', width: 100 }
    ]
});
</script>
```

## Возможности

- **Источники данных**: локальный массив, AJAX, функция
- **Пагинация**: клиентская и серверная
- **Сортировка**: одно- и многоколоночная
- **Фильтрация**:多种 типы фильтров
- **Выборка**: строк и ячеек
- **Редактирование**: inline, popup, incell
- **Группировка**: с агрегатными функциями
- **Виртуализация**: для больших объемов данных
- **Экспорт**: PDF, Excel, CSV, JSON
- **Темы**: Default, Material, Bootstrap, Dark

## Структура проекта

```
CM_DataGrid/
├── src/
│   ├── core/
│   │   ├── Grid.js          # Основной класс
│   │   ├── DataSource.js    # Управление данными
│   │   └── Column.js        # Класс колонки
│   ├── utils/
│   │   └── EventEmitter.js  # Система событий
│   ├── themes/
│   │   └── default.css      # Базовые стили
│   └── index.js             # Точка входа
├── examples/
│   └── index.html           # Примеры использования
├── dist/                    # Собранные файлы
└── package.json
```

## API

### Инициализация

```javascript
// Через jQuery
$('#grid').cmDataGrid(config);

// Через конструктор
const grid = new CMDataGrid('#grid', config);
```

### Методы

| Метод | Описание |
|-------|----------|
| `refresh()` | Обновление отображения |
| `reload()` | Перезагрузка данных |
| `setDataSource(data)` | Установка источника данных |
| `goToPage(page)` | Переход на страницу |
| `sort(field, dir)` | Сортировка |
| `filter(expr)` | Фильтрация |
| `select(row)` | Выбор строки |
| `getSelected()` | Получение выбранных |
| `destroy()` | Уничтожение таблицы |

### События

| Событие | Описание |
|---------|----------|
| `dataBound` | Данные загружены |
| `rowClick` | Клик по строке |
| `change` | Изменение выборки |
| `sort` | Применение сортировки |
| `pageChange` | Изменение страницы |

## Развитие

- [ ] Пагинация
- [ ] Сортировка
- [ ] Фильтрация
- [ ] Редактирование
- [ ] Экспорт
- [ ] Виртуализация

## Лицензия

MIT
