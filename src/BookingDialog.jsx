import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { X, MessageCircle, ArrowUpRight, Scissors } from 'lucide-react';
const money = value => value.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const combos = [['Corte + penteado',60],['Combo WM — corte + barba + sobrancelha',75],['Corte completo — corte + barba + sobrancelha + penteado',75]];
const BookingDialog = forwardRef(function BookingDialog({ services }, ref) {
  const dialog = useRef(null);
  const [barber,setBarber] = useState(null);
  const [selection,setSelection] = useState('');
  const options = [...services,...combos];
  useImperativeHandle(ref,()=>({open(person){setBarber(person);setSelection('');dialog.current.showModal();}}),[]);
  const selected = selection === '' ? null : options[Number(selection)];
  const message = selected && barber ? `Olá, ${barber.name}! Gostaria de agendar na WM Barbearia.\nServiço: ${selected[0]}\nValor da tabela: ${money(selected[1])}\nQuais horários você tem disponíveis?` : '';
  const href = barber ? `https://wa.me/55${barber.number}?text=${encodeURIComponent(message)}` : '';
  const close = () => dialog.current.close();
  return <dialog className="booking-dialog" data-lenis-prevent="" ref={dialog} aria-labelledby="booking-title" onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="booking-inner"><button className="booking-close" aria-label="Fechar agendamento" onClick={close}><X size={22}/></button>
      <Scissors size={28} className="booking-icon"/><span className="eyebrow">SEU PRÓXIMO VISUAL</span><h2 id="booking-title">Vamos agendar?</h2>
      <p>Escolha o serviço para falar com <strong>{barber?.name}</strong>.</p>
      <label htmlFor="booking-service">Qual serviço você quer?</label>
      <select id="booking-service" value={selection} onChange={e=>setSelection(e.target.value)}>
        <option value="" disabled>Selecione um serviço ou combo</option>
        <optgroup label="Serviços">{services.map(([name,value],i)=><option value={i} key={name}>{name} — {money(value)}</option>)}</optgroup>
        <optgroup label="Combos">{combos.map(([name,value],i)=><option value={services.length+i} key={name}>{name} — {money(value)}</option>)}</optgroup>
      </select>
      <div className="booking-summary" aria-live="polite">{selected ? <><span>Valor da tabela</span><strong>{money(selected[1])}</strong></> : <span>O valor aparece aqui após a escolha.</span>}</div>
      {selected ? <a className="button booking-continue" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Continuar no WhatsApp <ArrowUpRight size={17}/></a> : <button className="button booking-continue" disabled><MessageCircle size={18}/> Continuar no WhatsApp <ArrowUpRight size={17}/></button>}
      <p className="booking-note">A escolha prepara sua mensagem. O horário e a disponibilidade do serviço serão confirmados diretamente com o barbeiro pelo WhatsApp.</p>
    </div>
  </dialog>;
});
export default BookingDialog;
