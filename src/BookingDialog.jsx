import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { X, MessageCircle, ArrowUpRight, Scissors, CalendarCheck, LoaderCircle } from 'lucide-react';
import { todayAtShop, isOpenDay, formatBookingDate, shopTime, addBookingDays } from './lib/bookingTime';
import { combos, serviceId, serviceDuration, barberId } from './lib/bookingCatalog';
import { bookingConfigured, getAvailability, reserveBooking, bookingProject } from './lib/bookingApi';
import { readPendingBooking, savePendingBooking, clearPendingBooking } from './lib/bookingRecovery';
const money = value => value.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const BookingDialog = forwardRef(function BookingDialog({ services }, ref) {
  const dialog=useRef(null), inFlight=useRef(false), receiptTitle=useRef(null);
  const [opened,setOpened]=useState(false),[barber,setBarber]=useState(null);
  const [selection,setSelection]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState('');
  const [slots,setSlots]=useState([]),[loading,setLoading]=useState(false),[pending,setPending]=useState(false);
  const [error,setError]=useState(''),[refresh,setRefresh]=useState(0),[receipt,setReceipt]=useState(null);
  const [attempt,setAttempt]=useState(null);
  const [availabilityError,setAvailabilityError]=useState('');
  const displayError=error||availabilityError;
  const options=[...services,...combos];
  const selected=selection===''?null:options[Number(selection)];
  const duration=serviceDuration(selection);
  const today=todayAtShop(),maxDate=addBookingDays(today,60);
  const dateError=date&&(date<today?'Escolha uma data a partir de hoje.':date>maxDate?'A agenda abre com até 60 dias de antecedência.':!isOpenDay(date)?'Atendemos de terça a sábado. Escolha outro dia.':'');
  useImperativeHandle(ref,()=>({open(person){
    if(inFlight.current)return;
    const recovery=readPendingBooking(bookingProject,barberId(person));
    setBarber(person);setSelection(recovery?.selection||'');setDate(recovery?.date||'');setTime(recovery?.start||'');setAttempt(recovery);setSlots([]);setError('');setAvailabilityError('');setReceipt(null);setOpened(true);dialog.current.showModal();
  }}),[]);
  useEffect(()=>{if(receipt)receiptTitle.current?.focus();},[receipt]);
  useEffect(()=>{
    if(!opened||!barber||!selected||!date||dateError||!bookingConfigured||receipt||attempt)return;
    let disposed=false,controller,generation=0;
    setSlots([]);setLoading(true);
    const load=async()=>{
      const current=++generation;
      controller?.abort();controller=new AbortController();
      try{
        const result=await getAvailability({barber:barberId(barber),service:serviceId(selection),date,signal:controller.signal});
        if(disposed||current!==generation)return;
        setSlots(result);setAvailabilityError('');setTime(current=>result.some(s=>s.starts_at===current&&s.available)?current:'');
      }catch(e){if(disposed||current!==generation||e.name==='AbortError')return;setSlots([]);setAvailabilityError('Não foi possível consultar a agenda. Tente atualizar ou fale com o barbeiro.');}
      finally{if(!disposed&&current===generation)setLoading(false);}
    };
    load();const timer=setInterval(load,30000);window.addEventListener('focus',load);
    return()=>{disposed=true;controller?.abort();clearInterval(timer);window.removeEventListener('focus',load);};
  },[opened,barber,selection,date,dateError,refresh,receipt,attempt]);
  const resetChoice=()=>{setTime('');setSlots([]);setError('');setAvailabilityError('');};
  const close=()=>{if(!pending)dialog.current.close();};
  const canReserve=bookingConfigured&&selected&&date&&!dateError&&slots.some(s=>s.starts_at===time&&s.available)&&!loading&&!pending&&!attempt;
  const reserve=async()=>{
    if(inFlight.current||(!attempt&&!canReserve))return;
    const request=attempt||{requestId:crypto.randomUUID(),barber:barberId(barber),service:serviceId(selection),selection,date,start:time};
    inFlight.current=true;setPending(true);setError('');setAttempt(request);
    savePendingBooking(bookingProject,request);
    try{
      const result=await reserveBooking(request);
      clearPendingBooking(bookingProject,request.barber);setReceipt(result);setAttempt(null);
    }catch(e){
      if(['SLOT_TAKEN','INVALID_TIME','INVALID_SERVICE','INVALID_REQUEST'].includes(e.code)){
        clearPendingBooking(bookingProject,request.barber);setAttempt(null);setTime('');setRefresh(x=>x+1);
        if(e.code==='SLOT_TAKEN')setError('Esse horário acabou de ser reservado. Escolha outro horário.');
        else if(e.code==='INVALID_TIME')setError('Esse horário não está mais disponível. Consulte a agenda novamente.');
        else setError('A solicitação não está ativa ou não é válida. Consulte a agenda ou fale com o barbeiro.');
      }else{
        setError('A conexão falhou antes da confirmação. Use “Verificar minha reserva” para recuperar o resultado sem criar outra reserva.');
      }
    }finally{inFlight.current=false;setPending(false);}
  };
  const receiptDate=receipt?todayAtShop(new Date(receipt.starts_at)):'';
  const message=receipt?`Olá, ${barber.name}! Reservei um horário na WM Barbearia.\nServiço: ${receipt.service_name}\nValor da tabela: ${money(receipt.price_cents/100)}\nDia: ${formatBookingDate(receiptDate)}\nHorário: ${shopTime(new Date(receipt.starts_at))} às ${shopTime(new Date(receipt.ends_at))} (Brasília)\nReserva: ${receipt.id}\nGostaria de combinar os detalhes do atendimento.` : attempt ? `Olá, ${barber.name}! Enviei uma solicitação de reserva na WM Barbearia e não recebi a confirmação.\nServiço: ${selected?.[0]}\nDia: ${formatBookingDate(attempt.date)}\nHorário: ${shopTime(new Date(attempt.start))} (Brasília)\nSolicitação: ${attempt.requestId}\nPode verificar para mim?` : `Olá, ${barber?.name}! Gostaria de consultar os horários da WM Barbearia.${selected?`\nServiço: ${selected[0]}`:''}${date&&!dateError?`\nDia desejado: ${formatBookingDate(date)}`:''}`;
  const href=barber?`https://wa.me/55${barber.number}?text=${encodeURIComponent(message)}`:'';
  return <dialog className="booking-dialog" data-lenis-prevent="" ref={dialog} aria-labelledby="booking-title" onClose={()=>setOpened(false)} onCancel={e=>{if(pending)e.preventDefault();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="booking-inner"><button className="booking-close" aria-label="Fechar agendamento" disabled={pending} onClick={close}><X size={22}/></button>
      {receipt?<><CalendarCheck size={30} className="booking-icon"/><span className="eyebrow">SEU HORÁRIO ESTÁ GARANTIDO</span><h2 id="booking-title" ref={receiptTitle} tabIndex={-1}>Horário reservado!</h2><p>Seu atendimento com <strong>{barber.name}</strong> já está na agenda.</p><dl className="booking-receipt"><div><dt>Serviço</dt><dd>{receipt.service_name}</dd></div><div><dt>Dia</dt><dd>{formatBookingDate(receiptDate)}</dd></div><div><dt>Horário</dt><dd>{shopTime(new Date(receipt.starts_at))}–{shopTime(new Date(receipt.ends_at))} · Brasília</dd></div><div><dt>Valor</dt><dd>{money(receipt.price_cents/100)}</dd></div></dl><a className="button booking-continue" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Falar com {barber.name}<ArrowUpRight size={17}/></a><p className="booking-note">A reserva já bloqueou esse período. Para cancelar ou alterar, fale com o barbeiro.</p></>:<>
      <Scissors size={28} className="booking-icon"/><span className="eyebrow">SEU PRÓXIMO VISUAL</span><h2 id="booking-title">Vamos agendar?</h2>
      <p>Escolha seu serviço e horário com <strong>{barber?.name}</strong>.</p>
      <label htmlFor="booking-service">Qual serviço você quer?</label>
      <select id="booking-service" disabled={pending||Boolean(attempt)} value={selection} onChange={e=>{setSelection(e.target.value);resetChoice();}}>
        <option value="" disabled>Selecione um serviço ou combo</option>
        <optgroup label="Serviços">{services.map(([name,value],i)=><option value={i} key={name}>{name} — {money(value)}</option>)}</optgroup>
        <optgroup label="Combos">{combos.map(([name,value],i)=><option value={services.length+i} key={name}>{name} — {money(value)}</option>)}</optgroup>
      </select>
      {selected&&<p className="booking-hours">Tempo reservado: {duration/60} {duration===60?'hora':'horas'}</p>}
      <div className="booking-date-grid"><div><label htmlFor="booking-date">Dia do atendimento</label><input id="booking-date" type="date" min={today} max={maxDate} value={date} disabled={pending||Boolean(attempt)||!selected} onChange={e=>{setDate(e.target.value);resetChoice();}} aria-invalid={Boolean(dateError)} aria-describedby={dateError?'booking-date-error':'booking-hours'}/></div>
      <div><label htmlFor="booking-time">Horário disponível</label><select id="booking-time" value={time} disabled={!bookingConfigured||!date||Boolean(dateError)||loading||pending||Boolean(attempt)} onChange={e=>{setTime(e.target.value);setError('');}}><option value="" disabled>{loading?'Consultando…':'Escolha o horário'}</option>{attempt&&!slots.some(s=>s.starts_at===attempt.start)&&<option value={attempt.start}>{shopTime(new Date(attempt.start))} — verificação pendente</option>}{slots.map(s=><option value={s.starts_at} key={s.starts_at} disabled={!s.available}>{shopTime(new Date(s.starts_at))}{s.available?'':' — indisponível'}</option>)}</select></div></div>
      <p id="booking-hours" className="booking-hours">Terça a sábado, 10h às 21h · Horário de Brasília</p>
      {dateError&&<p className="booking-error" id="booking-date-error" role="alert">{dateError}</p>}
      {loading&&<p role="status" className="booking-hours">Consultando horários disponíveis…</p>}
      {bookingConfigured&&!attempt&&date&&!dateError&&selected&&!loading&&!displayError&&!slots.some(s=>s.available)&&<p className="booking-hours" role="status">Nenhum horário disponível para esse serviço neste dia. Escolha outra data.</p>}
      {displayError&&<div className="booking-error" role="alert"><p>{displayError}</p>{!pending&&!attempt&&<button className="booking-retry" onClick={()=>setRefresh(x=>x+1)}>Atualizar horários</button>}</div>}
      {attempt&&!pending&&<p className="booking-notice" role="status">Há uma solicitação aguardando confirmação para {formatBookingDate(attempt.date)}, às {shopTime(new Date(attempt.start))}. Verifique o resultado antes de escolher outro horário.</p>}
      {attempt&&!pending&&<a className="text-link booking-support" href={href} target="_blank" rel="noopener noreferrer">Consultar {barber.name} no WhatsApp <ArrowUpRight size={16}/></a>}
      <div className="booking-summary" aria-live="polite">{selected?<><span>Valor da tabela</span><strong>{money(selected[1])}</strong></>:<span>Escolha o serviço para consultar a agenda.</span>}</div>
      {bookingConfigured?<><button className="button booking-continue" onClick={reserve} disabled={pending||(!attempt&&!canReserve)} aria-busy={pending}>{pending?<LoaderCircle size={18} className="booking-spinner"/>:<CalendarCheck size={18}/>} {pending?'Confirmando…':attempt?'Verificar minha reserva':'Reservar horário'}<ArrowUpRight size={17}/></button><p className="booking-note">Ao reservar, todo o período do serviço fica bloqueado para outros clientes desse barbeiro. Depois, você poderá falar com ele pelo WhatsApp.</p></>:<><p className="booking-notice" role="status">A agenda online está sendo preparada. Por enquanto, consulte e combine o horário diretamente pelo WhatsApp.</p><a className="button booking-continue" href={href} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Consultar pelo WhatsApp<ArrowUpRight size={17}/></a></>}
      </>}
    </div>
  </dialog>;
});
export default BookingDialog;
