export const combos = [['Corte + penteado',60],['Combo WM — corte + barba + sobrancelha',75],['Corte completo — corte + barba + sobrancelha + penteado',75]];
const ids = ['corte-social','corte-degrade','navalhado','barba','sobrancelha','alisamento','luzes','progressiva','platinado','frizado','gel','pomada','penteado','pezinho','bigodinho','corte-penteado','combo-wm','corte-completo'];
export const serviceId = index => ids[index];
export const serviceDuration = index => [5,7].includes(Number(index)) ? 120 : 60;
export const barberId = barber => barber.name.toLowerCase();
