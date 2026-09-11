# UI-гайд — Service Center

## Палитра

| Цвет | HEX | Назначение |
|---|---|---|
| Primary | `#2563EB` | Кнопки, ссылки, акценты |
| Primary Dark | `#1D4ED8` | Hover-состояния |
| Success | `#16A34A` | Успех, статус «Выполнена» |
| Warning | `#F59E0B` | Предупреждение, статус «Новая» |
| Error | `#DC2626` | Ошибки, статус «Отклонена» |
| Info | `#0EA5E9` | Статус «В работе» |
| Background | `#F8FAFC` | Фон страниц |
| Surface | `#FFFFFF` | Карточки, панели |
| Border | `#E2E8F0` | Границы |
| Text | `#0F172A` | Основной текст |
| Text Muted | `#64748B` | Вспомогательный текст |

## Шрифты

**Семейство:** Inter  
**Fallback:** 'Segoe UI', system-ui, sans-serif

| Элемент | Размер (desktop) | Размер (mobile) | Вес |
|---|---|---|---|
| H1 | 28px | 24px | 700 (Bold) |
| H2 | 22px | 20px | 600 (SemiBold) |
| H3 | 18px | 16px | 600 |
| Body | 16px | 15px | 400 |
| Small | 14px | 13px | 400 |
| Button | 15px | 15px | 600 |

## Сетка и отступы

- **Базовый шаг:** 8px
- **Container max-width:** 900px
- **Container padding:** 16px (desktop), 12px (mobile)
- **Карточки:** padding 20px, border-radius 12px
- **Между блоками:** 20px (mobile), 24px (desktop)

## Адаптив

- **Точка мобильного:** `max-width: 480px` (покрывает 390×844)
- **Точка планшета:** `max-width: 768px`

## Доступность

- **Контраст:** все тексты ≥ 4.5:1 по WCAG AA
- **Фокус-состояния:** видимая рамка `2px solid #2563EB` через `:focus-visible`
- **Кликабельные элементы:** минимум 44×44px

## Компоненты

- **Кнопки:** primary (синяя), secondary (серая), block (на всю ширину)
- **Поля ввода:** 11px 13px padding, border 2px, radius 6px
- **Ошибки:** красный текст под полем, красный border
- **Уведомления:** тост в правом верхнем углу, автоскрытие 3 сек