import {getCart,cartTotal,clearCart} from './store.release-20260804-1.js';
import {money} from './render.release-20260804-2.js';

const qs=selector=>document.querySelector(selector);
const enabledMethods=config=>config.fulfillment.deliveryMethods.filter(method=>method.enabled);
const methodById=(config,id)=>enabledMethods(config).find(method=>method.id===id)||enabledMethods(config)[0];
const deliveryFee=method=>Number(method?.fee)||0;

function fullAddress(data){
  return [
    `${data.get('address')}, ${data.get('addressNumber')}`,
    data.get('district'),
    data.get('complement')
  ].filter(Boolean).join(' — ');
}

function buildMessage(config,data,method){
  const subtotal=cartTotal();const fee=deliveryFee(method);const total=subtotal+fee;
  const scheduleDate=data.get('scheduled')==='yes'?formatScheduleDate(data.get('scheduleDate')):'';
  const productLines=getCart().flatMap(item=>[
    `• ${item.quantity}x ${item.name} — ${item.variantLabel}`,
    `  ${money(item.price*item.quantity,config.currency,config.locale)}`
  ]);
  return [
    'Olá!','',
    'Gostaria de confirmar o seguinte pedido.','',
    '🧁 *Produtos*','',...productLines,'',
    '💰 *Resumo*','',
    `Subtotal: ${money(subtotal,config.currency,config.locale)}`,
    `Frete: ${money(fee,config.currency,config.locale)}`,
    `Total: ${money(total,config.currency,config.locale)}`,'',
    '👤 *Contato*','',
    `Nome: ${data.get('name')}`,
    `Telefone: ${data.get('phone')}`,'',
    `📍 *${method.label}*`,'',
    method.requiresAddress?fullAddress(data):'Retirada no local.','',
    scheduleDate?'📅 *Agendamento*':'',scheduleDate||'','',
    '💳 *Forma de pagamento*','',data.get('payment'),'',
    '📝 *Observações*','',data.get('notes')||'Sem observações.','',
    'Pedido realizado através do catálogo digital YOITES.'
  ].join('\n');
}

function localDateISO(){
  const now=new Date();const offset=now.getTimezoneOffset()*60000;
  return new Date(now.getTime()-offset).toISOString().slice(0,10);
}

function formatScheduleDate(value){
  if(!value)return'';const [year,month,day]=value.split('-');return `${day}/${month}/${year}`;
}

export function setupCheckout(config){
  const form=qs('[data-checkout-form]');const deliveryBox=qs('[data-delivery-options]');const addressFields=qs('[data-address-fields]');const fallback=qs('[data-whatsapp-fallback]');const submitButton=qs('[data-submit-order]');const scheduleToggle=qs('[data-schedule-toggle]');const scheduleFields=qs('[data-schedule-fields]');const scheduleDate=qs('[data-schedule-date]');
  deliveryBox.innerHTML=enabledMethods(config).map((method,index)=>`<label class="choice"><input type="radio" name="delivery" value="${method.id}" ${index===0?'checked':''} required><span><strong>${method.label}</strong><small>${money(deliveryFee(method),config.currency,config.locale)}</small></span></label>`).join('');
  qs('[data-payment-options]').innerHTML=`<option value="">Selecione</option>${config.fulfillment.paymentMethods.filter(method=>method.enabled).map(method=>`<option value="${method.label}">${method.label}</option>`).join('')}`;
  const toggleAddress=()=>{
    const method=methodById(config,form.elements.delivery.value);const required=method?.requiresAddress??false;
    addressFields.hidden=!required;
    ['address','addressNumber','district'].forEach(name=>{form.elements[name].required=required});
    updateCheckoutSummary(config,method.id);
  };
  const toggleSchedule=()=>{const enabled=scheduleToggle.checked;scheduleFields.hidden=!enabled;scheduleDate.required=enabled;scheduleDate.min=localDateISO();if(!enabled)scheduleDate.value='';updateCheckoutSummary(config)};
  form.addEventListener('change',event=>{if(event.target.name==='delivery')toggleAddress();if(event.target===scheduleToggle)toggleSchedule();if(event.target===scheduleDate)updateCheckoutSummary(config)});toggleAddress();toggleSchedule();
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity()||!getCart().length)return;
    const data=new FormData(form);const method=methodById(config,data.get('delivery'));
    const destination=(config.demoMode?config.demoWhatsapp:config.contact.whatsapp).replace(/\D/g,'');
    const whatsappUrl=`https://wa.me/${destination}?text=${encodeURIComponent(buildMessage(config,data,method))}`;
    fallback.href=whatsappUrl;fallback.hidden=false;submitButton.textContent='Abrindo WhatsApp…';
    clearCart();
    try{fallback.click()}catch{window.location.href=whatsappUrl}
    setTimeout(()=>{submitButton.textContent='Enviar pedido pelo WhatsApp';fallback.focus()},900);
  });
}

export function updateCheckoutSummary(config,methodId){
  const form=qs('[data-checkout-form]');const method=methodById(config,methodId||form?.elements.delivery?.value);const subtotal=cartTotal();const fee=deliveryFee(method);const total=subtotal+fee;
  const scheduled=Boolean(form?.elements.scheduled?.checked);const scheduleText=scheduled&&form.elements.scheduleDate.value?formatScheduleDate(form.elements.scheduleDate.value):'';
  const lines=getCart().map(item=>`<div class="summary-line summary-product"><span>${item.quantity}x ${item.name}<small>${item.variantLabel}</small></span><strong>${money(item.price*item.quantity,config.currency,config.locale)}</strong></div>`).join('');
  qs('[data-checkout-summary]').innerHTML=`<p class="summary-title">Resumo do pedido</p>${lines}<div class="summary-divider"></div><div class="summary-line"><span>Subtotal</span><strong>${money(subtotal,config.currency,config.locale)}</strong></div><div class="summary-line"><span>Frete · ${method.label}</span><strong>${money(fee,config.currency,config.locale)}</strong></div>${scheduleText?`<div class="summary-line"><span>Agendamento</span><strong>${scheduleText}</strong></div>`:''}<div class="summary-line summary-total"><span>Total</span><strong>${money(total,config.currency,config.locale)}</strong></div>`;
}

