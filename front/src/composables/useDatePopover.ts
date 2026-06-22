import { reactive } from 'vue'

export interface DatePopoverState {
  open: boolean
  event: Event | null
}

export function useDatePopover() {
  const popover = reactive<DatePopoverState>({
    open: false,
    event: null,
  })

  function open(event: Event | null) {
    popover.open = true
    popover.event = event
  }

  function close() {
    popover.open = false
    popover.event = null
  }

  return { popover, open, close }
}
