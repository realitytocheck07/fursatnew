import { createElement as h } from 'react'

// Wraps a text field and shows "12 / 60" under it. Turns red over the limit.
export function withCharCount(max) {
  return function CharCountInput(props) {
    const used = typeof props.value === 'string' ? props.value.length : 0
    const over = used > max
    return h(
      'div',
      null,
      props.renderDefault(props),
      h(
        'div',
        { style: { marginTop: 6, fontSize: 12, textAlign: 'right', fontWeight: over ? 600 : 400, color: over ? '#c0291f' : '#5c4a2a' }, 'aria-live': 'polite' },
        `${used} / ${max} characters`,
      ),
    )
  }
}
