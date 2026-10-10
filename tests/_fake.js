// 가짜 Supabase(window.supabase) — sync-robust·regress-1.2.3·regress-1.2.5 등이 같이 쓴다. addInitScript 로 심는 함수라 바깥을 참조하지 않는다.
const FAKE=(opt)=>{
  try{ Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'https://x.supabase.co/rest/v1/',SUPABASE_ANON_KEY:'k'},writable:false,configurable:false}); }catch(_){}
  try{ localStorage.setItem('yd_tour','done'); }catch(e){}
  const F=window.__fake={
    mode: opt.mode||'live',                                   // live | dead(데이터 전부 실패) | noinit(가족 확인만 실패)
    session: opt.session===undefined ? {user:{id:'u1'}} : opt.session,
    members: opt.members || [{family_id:'f1',families:{code:'K7PM-3QRA'}}],
    kids: opt.kids || [{id:'k1',family_id:'f1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T00:00:00Z'},
                       {id:'k2',family_id:'f1',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-02T00:00:00Z'}],
    ents: opt.ents || [{id:'e1',family_id:'f1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,skipped:false,created_by:'u1',updated_by:'u1',created_at:'2026-09-14T09:00:00Z'},
                       {id:'e2',family_id:'f1',child_id:'k1',entry_date:'2026-09-13',memo:'용돈',amount:3000,auto_key:'w:2026-09-13',skipped:false,created_by:'u1',updated_by:'u1',created_at:'2026-09-13T09:00:00Z'}],
    calls:{join:0,create:0,subscribe:0,anon:0,insert:0,update:0,delete:0,upsert:0}, n:100,   // 새 id 는 e101… — 시드(e1·e2)와 겹치지 않게
    createFail:false, childFail:false, insertDelay:0, insertFail:false, joinError:null, createClientArgs:null, signedOut:false, authCb:null
  };
  const dead=()=>Promise.reject(new Error('Failed to fetch'));
  const ok=(data)=>Promise.resolve({data,error:null});
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  function q(table){
    const st={op:'select',filters:{},payload:null,gt:null,from:0,to:null};
    const b={select(){return b;}, eq(k,v){st.filters[k]=v;return b;}, order(){return b;}, gt(k,v){st.gt=[k,v];return b;},
      limit(n){st.to=st.from+n-1;return finish();}, range(a,z){st.from=a;st.to=z;return finish();}, single(){return finish();},
      insert(x){st.op='insert';st.payload=x;return b;}, update(x){st.op='update';st.payload=x;return b;},
      delete(){st.op='delete';return b;}, upsert(x){st.op='upsert';st.payload=x;return b;},
      then(f,r){return finish().then(f,r);}};
    function finish(){
      if(table==='family_members') return F.mode==='noinit' ? dead() : ok(F.members);
      if(F.mode==='dead') return dead();
      if(F.signedOut) return Promise.resolve({data:null,error:{message:'permission denied for function is_member'}});   // 세션이 지워진 뒤의 요청 = anon 역할
      // 진짜 PostgREST 처럼: familyId 가 없는 채로 .eq("id", null) 이 나가면 uuid 오류 (옛 코드의 H1 이 바로 이것)
      const key = table==='families' ? 'id' : 'family_id';
      if(st.op==='select' && (st.filters[key]===null || st.filters[key]===undefined))
        return Promise.resolve({data:null,error:{message:'invalid input syntax for type uuid: "null"'}});
      if(st.op==='select'){
        if(table==='families') return ok({id:'f1',code:'K7PM-3QRA'});
        if(table==='children') return ok(F.kids.slice());
        if(table==='entries'){                                   // 진짜 PostgREST 처럼 id 순 · gt · 범위 — 페이징을 흉내 낸다
          let rows=F.ents.slice().sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0);
          if(st.gt) rows=rows.filter(x=>x[st.gt[0]]>st.gt[1]);
          if(st.to!=null) rows=rows.slice(st.from, st.to+1);
          F.calls.pages=(F.calls.pages||0)+1;
          const out=ok(rows); if(F.afterPage) F.afterPage(F.calls.pages); return out;
        }
      }
      if(table==='entries'){
        if(st.op==='insert'){ F.calls.insert++; const e=Object.assign({id:'e'+(++F.n),created_at:new Date().toISOString(),skipped:false},st.payload);
          return wait(F.insertDelay).then(()=>{
            if(F.insertFail) return {data:null,error:{message:'Failed to fetch'}};
            F.ents.push(e); return {data:e,error:null}; }); }
        if(st.op==='update'){ F.calls.update++; const e=F.ents.find(x=>x.id===st.filters.id); if(e) Object.assign(e,st.payload); return ok(e?[{id:e.id}]:[]); }   // 고친 줄(.select) — 없으면 빈 배열
        if(st.op==='delete'){ F.calls.delete++; F.ents=F.ents.filter(x=>x.id!==st.filters.id); return ok(null); }
        if(st.op==='upsert'){ F.calls.upsertRows=(F.calls.upsertRows||0)+(st.payload||[]).length; F.lastUpsert=st.payload; return ok([]); }
      }
      if(table==='children'){
        if(st.op==='insert'){ F.calls.upsert++; if(F.childFail) return Promise.resolve({data:null,error:{message:'boom'}});
          const c=Object.assign({id:'k'+(++F.n),created_at:new Date().toISOString()},st.payload); F.kids.push(c); return ok(c); }
        if(st.op==='update'){ F.calls.upsert++; const c=F.kids.find(x=>x.id===st.filters.id); return wait(F.childDelay||0).then(()=>{ if(c) Object.assign(c,st.payload); return {data:c,error:null}; }); }
        if(st.op==='delete'){ F.calls.delete++; F.kids=F.kids.filter(x=>x.id!==st.filters.id); return ok(null); }
      }
      return ok(null);
    }
    return b;
  }
  window.supabase={createClient:(url,key)=>{ F.createClientArgs=[url,key]; return {
    auth:{getSession:()=>Promise.resolve({data:{session:F.session}}),
          signInAnonymously:()=>{ F.calls.anon++; F.signedOut=false; F.session={user:{id:'u'+(++F.n)}}; return Promise.resolve({data:{session:F.session},error:null}); },
          onAuthStateChange:(cb)=>{ F.authCb=cb; return {data:{subscription:{unsubscribe(){}}}}; }},
    from:q,
    rpc:(name,args)=>{
      if(name==='join_family'){ F.calls.join++; if(F.mode==='dead') return dead(); if(F.joinError) return Promise.resolve({data:null,error:{message:F.joinError}}); F.members=[{family_id:'f1',families:{code:args.p_code}}]; return ok('f1'); }
      if(name==='create_family'){ F.calls.create++; if(F.createFail) return Promise.resolve({data:null,error:{message:'gate'}}); F.members=[{family_id:'f1',families:{code:args.p_code}}]; return ok('f1'); }
      if(name==='gate_state') return ok({is_owner:true,open_until:null});
      return ok(null); },
    channel:()=>({on(){return this;},subscribe(){ F.calls.subscribe++; return this; }}),
    removeChannel:()=>{ F.calls.removeChannel=(F.calls.removeChannel||0)+1; return Promise.resolve('ok'); }
  };}};
};
const CACHE=()=>localStorage.setItem('yd_cache_v1',JSON.stringify({family:{id:'f1',code:'K7PM-3QRA'},
  children:[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],
  entries:[{id:'e1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,created_at:'2026-09-14T09:00:00Z'}],at:Date.now()}));


module.exports={FAKE,CACHE};
