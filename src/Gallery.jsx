import React, { useRef, useState } from 'react';
import { ArrowUpRight, X, ArrowLeft, ArrowRight } from 'lucide-react';
const photos = [
  { file: 'degrade-finalizado', title: 'Detalhe por detalhe', alt: 'Corte com degradê e finalização em linhas vistas de cima', width:1170,height:1414 },
  { file: 'platinado-degrade', title: 'Platinado com presença', alt: 'Cabelo platinado curto com degradê nas laterais',width:1170,height:1433 },
  { file: 'corte-alinhado', title: 'Alinhamento na régua', alt: 'Corte com topo reto e contorno alinhado',width:1170,height:1530 },
  { file: 'finalizacao-desenhada', title: 'Finalização que marca', alt: 'Detalhes da finalização em linhas no topo do cabelo',width:1170,height:1171 },
  { file: 'platinado', title: 'Um novo visual', alt: 'Resultado de cabelo platinado visto por trás',width:1170,height:1458 },
];
export default function Gallery(){
  const dialog=useRef(null);const[index,setIndex]=useState(0);
  const open=i=>{setIndex(i);dialog.current.showModal();};
  const next=direction=>setIndex(i=>(i+direction+photos.length)%photos.length);
  const photo=photos[index];
  return <section className="gallery section container" id="cortes">
    <div className="section-heading" data-motion="fade"><div><span className="eyebrow">FEITO AQUI, NA WM</span><h2>O resultado fala.<br/><em>O estilo é seu.</em></h2></div><p>Cortes e finalizações reais da nossa cadeira.<br/>Toque nas fotos para ver de perto.</p></div>
    <div className="gallery-grid" data-stagger="">{photos.map((p,i)=><button className="gallery-item" key={p.file} onClick={()=>open(i)} aria-label={'Ampliar foto: '+p.title}><img src={'/images/'+p.file+'.jpg'} width={p.width} height={p.height} alt={p.alt} loading="lazy" decoding="async"/><span className="gallery-caption"><span>{p.title}</span><ArrowUpRight size={18}/></span></button>)}</div>
    <dialog data-lenis-prevent="" className="photo-dialog" ref={dialog} aria-label="Galeria de cortes WM" onClick={e=>{if(e.target===e.currentTarget)dialog.current.close();}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();next(1);}if(e.key==='ArrowLeft'){e.preventDefault();next(-1);}}}>
      <div className="photo-dialog-inner"><button className="photo-close" aria-label="Fechar foto" autoFocus onClick={()=>dialog.current.close()}><X/></button><img src={'/images/'+photo.file+'.jpg'} alt={photo.alt} width={photo.width} height={photo.height}/><div className="photo-controls"><button aria-label="Foto anterior" onClick={()=>next(-1)}><ArrowLeft size={20}/></button><p aria-live="polite">{photo.title}<small>{index+1} / {photos.length}</small></p><button aria-label="Próxima foto" onClick={()=>next(1)}><ArrowRight size={20}/></button></div></div>
    </dialog>
  </section>;
}
