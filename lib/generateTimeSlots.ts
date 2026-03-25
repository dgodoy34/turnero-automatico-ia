export function generateTimeSlots(settings: {
  open_time: string;
  close_time: string;
  slot_interval: number;
}) {

  const slots: string[] = [];

  const [openHour, openMin] = settings.open_time.split(":").map(Number);
  const [closeHour, closeMin] = settings.close_time.split(":").map(Number);

  let current = new Date();
  current.setHours(openHour, openMin, 0, 0);

  const end = new Date();
  end.setHours(closeHour, closeMin, 0, 0);

  while (current < end) {

    const hh = String(current.getHours()).padStart(2, "0");
    const mm = String(current.getMinutes()).padStart(2, "0");

    slots.push(`${hh}:${mm}`);

    current = new Date(current.getTime() + settings.slot_interval * 60000);
  }

  return slots;
}