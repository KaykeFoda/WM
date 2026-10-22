import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { X, MessageCircle, ArrowUpRight, Scissors, CalendarCheck, LoaderCircle } from 'lucide-react';
import { todayAtShop, isOpenDay, formatBookingDate, shopTime, addBookingDays } from './lib/bookingTime';
import { combos, serviceId, serviceDuration, barberId } from './lib/bookingCatalog';
import { bookingConfigured, getAvailability, reserveBooking } from './lib/bookingApi';
const money = value => value.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const BookingDialog = forwardRef(function BookingDialog({ services }, ref) {
  const dialog=useRef(null), requestId=useRef(null);
  const [opened,setOpened]=useState(false),[barber,setBarber]=useState(null);
  const [selection,setSelection]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState('');
  const [slots,setSlots]=useState([]),[loading,setLoading]=useState(false),[pending,setPending]=useState(false);
  const [error,setError]=useState(''),[refresh,setRefresh]=useState(0),[receipt,setReceipt]=useState(null);
  const options=[...services,...combos];
  const selected=selection===''?null:options[Number(selection)];
  const duration=serviceDuration(selection);
  const today=todayAtShop(),maxDate=addBookingDays(today,60);
  const dateError=date&&(date<today?'Escolha uma data a partir de hoje.':date>maxDate?'A agenda abre com até 60 dias de antecedência.':!isOpenDay(date)?'Atendemos de terça a sábado. Escolha outro dia.':'');
  useImperativeHandle(ref,()=>({open(person){
    setBarber(person);setSelection('');setDate('');setTime('');setSlots([]);setError('');setReceipt(null);requestId.current=null;setOpened(true);dialog.current.showModal();
  }}),[]);
  useEffect(()=>{
    if(!opened||!barber||!selected||!date||dateError||!bookingConfigured||receipt)return;
    let disposed=false,controller;
    setSlots([]);setLoading(true);
    const load=async()=>{
      controller?.abort();controller=new AbortController();
      try{
        const result=await getAvailability({barber:barberId(barber),service:serviceId(selection),date,signal:controller.signal});
        if(disposed)return;
        setSlots(result);setError(current=>current.startsWith('Esse horário')?current:'');setTime(current=>result.some(s=>s.starts_at===current&&s.available)?current:'');
      }catch(e){if(disposed||e.name==='AbortError')return;setSlots([]);setError('Não foi possível consultar a agenda. Tente atualizar ou fale com o barbeiro.');}
      finally{if(!disposed)setLoading(false);}
    };
    load();const timer=setInterval(load,30000);window.addEventListener('focus',load);
    return()=>{disposed=true;controller?.abort();clearInterval(timer);window.removeEventListener('focus',load);};
  },[opened,barber,selection,date,dateError,refresh,receipt]);
  const resetChoice=()=>{setTime('');setSlots([]);setError('');requestId.current=null;};
  const close=()=>{if(!pending)dialog.current.close();};
  const canReserve=bookingConfigured&&selected&&date&&!dateError&&slots.some(s=>s.starts_at===time&&s.available)&&!loading&&!pending;
  const reserve=async()=>{
    if(!canReserve)return;setPending(true);setError('');
    if(!requestId.current)requestId.current=crypto.randomUUID();
    try{
      const result=await reserveBooking({requestId:requestId.current,barber:barberId(barber),service:serviceId(selection),start:time});
      setReceipt(result);
    }catch(e){
      if(e.code==='SLOT_TAKEN'){setError('Esse horário acabou de ser reservado. Escolha outro horário.');setTime('');setRefresh(x=>x+1);requestId.current=null;}
      else if(e.code==='INVALID_TIME'){setError('Esse horário não está mais disponível. Consulte a agenda novamente.');setTime('');setRefresh(x=>x+1);requestId.current=null;}
      else setError('Não conseguimos confirmar a reserva. Tente novamente; a mesma solicitação não será duplicada.');
    }finally{setPending(false);}
  };
  const receiptDate=receipt?todayAtShop(new Date(receipt.starts_at)):'';
  const message=receipt?`Olá, ${barber.name}! Reservei um horário na WM Barbearia.\nServiço: ${receipt.service_name}\nValor da tabela: ${money(receipt.price_cents/100)}\nDia: ${formatBookingDate(receiptDate)}\nHorário: ${shopTime(new Date(receipt.starts_at))} às ${shopTime(new Date(receipt.ends_at))} (Brasília)\nReserva: ${receipt.id}\nGostaria de combinar os detalhes do atendimento.`:`Olá, ${barber?.name}! Gostaria de consultar os horários da WM Barbearia.${selected?`\nServiço: ${selected[0]}`:''}${date&&!dateError?`\nDia desejado: ${formatBookingDate(date)}`:''}`;
  const href=barber?`https://wa.me/55${barber.number}?text=${encodeURIComponent(message)}`:'';
  return <dialog className="booking-dialog" data-lenis-prevent="" ref={dialog} aria-labelledby="booking-title" onClose={()=>setOpened(false)} onCancel={e=>{if(pending)e.preventDefault();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="booking-inner"><button className="booking-close" aria-label="Fechar agendamento" disabled={pending} onClick={close}><X size={22}/></button>
      {receipt?<><CalendarCheck size={30} className="booking-icon"/><span className="eyebrow">SEU HORÁRIO ESTÁ GARANTIDO</span><h2 id="booking-title">Horário reservado!</h2><p>Seu atendimento com <strong>{barber.name}</strong> já está na agenda.</p><dl className="booking-receipt"><div><dt>Serviço</dt><dd>{receipt.service_name}</dd></div><div><dt>Dia</dt><dd>{formatBookingDate(receiptDate)}</dd></div><div><dt>Horário</dt><dd>{shopTime(new Date(receipt.starts_at))}–{shopTime(new Date(receipt.ends_at))} · Brasília</dd></div><div><dt>Valor</dt><dd>{money(receipt.price_cents/100)}</dd></div></dl><a className="button booking-continue" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Falar com {barber.name}<ArrowUpRight size={17}/></a><p className="booking-note">A reserva já bloqueou esse período. Para cancelar ou alterar, fale com o barbeiro.</p></>:<>
      <Scissors size={28} className="booking-icon"/><span className="eyebrow">SEU PRÓXIMO VISUAL</span><h2 id="booking-title">Vamos agendar?</h2>
      <p>Escolha seu serviço e horário com <strong>{barber?.name}</strong>.</p>
      <label htmlFor="booking-service">Qual serviço você quer?</label>
      <select id="booking-service" disabled={pending} value={selection} onChange={e=>{setSelection(e.target.value);resetChoice();}}>
        <option value="" disabled>Selecione um serviço ou combo</option>
        <optgroup label="Serviços">{services.map(([name,value],i)=><option value={i} key={name}>{name} — {money(value)}</option>)}</optgroup>
        <optgroup label="Combos">{combos.map(([name,value],i)=><option value={services.length+i} key={name}>{name} — {money(value)}</option>)}</optgroup>
      </select>
      {selected&&<p className="booking-hours">Tempo reservado: {duration/60} {duration===60?'hora':'horas'}</p>}
      <div className="booking-date-grid"><div><label htmlFor="booking-date">Dia do atendimento</label><input id="booking-date" type="date" min={today} max={maxDate} value={date} disabled={pending||!selected} onChange={e=>{setDate(e.target.value);resetChoice();}} aria-invalid={Boolean(dateError)} aria-describedby={dateError?'booking-date-error':'booking-hours'}/></div>
      <div><label htmlFor="booking-time">Horário disponível</label><select id="booking-time" value={time} disabled={!bookingConfigured||!date||Boolean(dateError)||loading||pending} onChange={e=>{setTime(e.target.value);setError('');requestId.current=null;}}><option value="" disabled>{loading?'Consultando…':'Escolha o horário'}</option>{slots.map(s=><option value={s.starts_at} key={s.starts_at} disabled={!s.available}>{shopTime(new Date(s.starts_at))}{s.available?'':' — indisponível'}</option>)}</select></div></div>
      <p id="booking-hours" className="booking-hours">Terça a sábado, 10h às 21h · Horário de Brasília</p>
      {dateError&&<p className="booking-error" id="booking-date-error" role="alert">{dateError}</p>}
      {loading&&<p role="status" className="booking-hours">Consultando horários disponíveis…</p>}
      {bookingConfigured&&date&&!dateError&&selected&&!loading&&!error&&!slots.some(s=>s.available)&&<p className="booking-hours" role="status">Nenhum horário disponível para esse serviço neste dia. Escolha outra data.</p>}
      {error&&<div className="booking-error" role="alert"><p>{error}</p>{!pending&&<button className="booking-retry" onClick={()=>setRefresh(x=>x+1)}>Atualizar horários</button>}</div>}
      <div className="booking-summary" aria-live="polite">{selected?<><span>Valor da tabela</span><strong>{money(selected[1])}</strong></>:<span>Escolha o serviço para consultar a agenda.</span>}</div>
      {bookingConfigured?<><button className="button booking-continue" onClick={reserve} disabled={!canReserve}>{pending?<LoaderCircle size={18} className="booking-spinner"/>:<CalendarCheck size={18}/>} {pending?'Reservando…':'Reservar horário'}<ArrowUpRight size={17}/></button><p className="booking-note">Ao reservar, todo o período do serviço fica bloqueado para outros clientes desse barbeiro. Depois, você poderá falar com ele pelo WhatsApp.</p></>:<><p className="booking-notice" role="status">A agenda online está sendo preparada. Por enquanto, consulte e combine o horário diretamente pelo WhatsApp.</p><a className="button booking-continue" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Consultar pelo WhatsApp<ArrowUpRight size={17}/></a></>}
      </>}
    </div>
  </dialog>;
});
export default BookingDialog;
