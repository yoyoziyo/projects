import {getCart,cartTotal} from './store.js';
import {money} from './render.js';

const qs=s=>document.querySelector(s);

function buildMessage(config,data,method){
  const productLines=getCart().map(item=>`• ${item.quantity}x ${item.name}`);
  return [
    'Olá!','',
    'Gostaria de realizar o seguinte pedido.','',
    '🧁 *Produtos*','',...productLines,'',
    '💰 *Total*','',money(cartTotal(),config.currency,config.locale),'',
    '👤 *Cliente*','',data.get('name'),'',
    '📞 *Telefone*','',data.get('phone'),'',
    `📍 *${method.label}*`,'',method.requiresAddress?data.get('address'):config.business.address,'',
    '📝 *Observações*','',data.get('notes')||'Sem observações.','',
    '💳 *Forma de pagamento*','',data.get('payment'),'',
    'Pedido realizado através do catálogo digital YOITES.'
  ].join('\n');
}

export function setupCheckout(config){
  const form=qs('[data-checkout-form]');
  const deliveryBox=qs('[data-delivery-options]');
  const addressField=qs('[data-address-field]');
  deliveryBox.innerHTML=config.fulfillment.deliveryMethods.filter(m=>m.enabled).map((m,i)=>`<label class="choice"><input type="radio" name="delivery" value="${m.id}" ${i===0?'checked':''} required><span>${m.label}</span></label>`).join('');
  qs('[data-payment-options]').innerHTML=`<option value="">Selecione</option>${config.fulfillment.paymentMethods.filter(m=>m.enabled).map(m=>`<option value="${m.label}">${m.label}</option>`).join('')}`;
  const toggleAddress=()=>{
    const method=config.fulfillment.deliveryMethods.find(m=>m.id===form.elements.delivery.value);
    const needsAddress=method?.requiresAddress??false;
    addressField.hidden=!needsAddress;form.elements.address.required=needsAddress;
  };
  form.addEventListener('change',event=>{if(event.target.name==='delivery')toggleAddress()});toggleAddress();
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity()||!getCart().length)return;
    const data=new FormData(form);
    const method=config.fulfillment.deliveryMethods.find(m=>m.id===data.get('delivery'));
    const destination=(config.demoMode?config.demoWhatsapp:config.contact.whatsapp).replace(/\D/g,'');
    window.open(`https://wa.me/${destination}?text=${encodeURIComponent(buildMessage(config,data,method))}`,'_blank','noopener,noreferrer');
  });
}

export function updateCheckoutSummary(config){
  const lines=getCart().map(i=>`<div class="summary-line"><span>${i.quantity}x ${i.name}</span><strong>${money(i.price*i.quantity,config.currency,config.locale)}</strong></div>`).join('');
  qs('[data-checkout-summary]').innerHTML=`${lines}<div class="summary-line"><span>Total</span><strong>${money(cartTotal(),config.currency,config.locale)}</strong></div>`;
}
