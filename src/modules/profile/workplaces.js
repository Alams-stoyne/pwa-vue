/**
 * Справочник мест работы (23 варианта).
 * Замените список на актуальный — компонент подхватит автоматически.
 */
export const WORKPLACES = [
  { value: 'x5-group',     label: 'X5 Group' },
  { value: 'pyaterochka',  label: 'Пятёрочка' },
  { value: 'perekrestok',  label: 'Перекрёсток' },
  { value: 'chizhik',      label: 'Чижик' },
  { value: 'karusel',      label: 'Карусель' },
  { value: 'x5-tech',      label: 'X5 Tech' },
  { value: 'x5-digital',   label: 'X5 Digital' },
  { value: 'x5-media',     label: 'X5 Media' },
  { value: 'x5-club',      label: 'X5 Club' },
  { value: 'x5-import',    label: 'X5 Import' },
  { value: 'x5-transport', label: 'X5 Транспорт' },
  { value: '5post',        label: '5Post' },
  { value: 'many-salmon',  label: 'Много Лосося' },
  { value: 'okolo',        label: 'Около' },
  { value: 'vprok',        label: 'Впрок' },
  { value: 'x5-loyalty',   label: 'X5 Loyalty' },
  { value: 'x5-finance',   label: 'X5 Финансы' },
  { value: 'x5-hr',        label: 'X5 HR' },
  { value: 'x5-marketing', label: 'X5 Маркетинг' },
  { value: 'x5-logistics', label: 'X5 Логистика' },
  { value: 'x5-direct',    label: 'X5 Direct' },
  { value: 'partner',      label: 'Партнёр' },
  { value: 'other',        label: 'Другое' },
]

export function getWorkplaceLabel(value) {
  return WORKPLACES.find((w) => w.value === value)?.label || ''
}