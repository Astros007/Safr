// Exposure is a route-ranking estimate, not a probability of injury.
export function comparisonSummary(plan){
 const a=plan.safest.assessment,b=plan.quickest.assessment;
 const extra=Math.max(0,Math.round((plan.safest.summary.time-plan.quickest.summary.time)/60));
 const time=extra?`+${extra} min vs. quickest`:'No extra travel time';
 if(!a||!b)return {kind:'unknown',headline:'Safety comparison unavailable',detail:'Road data is missing for one or both routes.',time,percent:null};
 if(plan.compared<2)return {kind:'single',headline:'One route found',detail:'No alternative route was returned to compare.',time,percent:null};
 if(plan.safest===plan.quickest)return {kind:'same',headline:'Safety pick is also quickest',detail:'Lowest estimated exposure among the assessed routes.',time,percent:null};
 const percent=b.score>0?(1-a.score/b.score)*100:null;
 if(percent!==null&&percent>=1)return {kind:'lower',headline:`${Math.round(percent)}% lower`,detail:'estimated traffic exposure than the quickest route',time,percent};
 if(percent!==null&&percent<=-1)return {kind:'higher',headline:plan.goal==='crossings'?'Fewer-crossing preference':'Higher estimated exposure',detail:`${Math.round(-percent)}% higher estimated exposure than the quickest route.`,time,percent};
 return {kind:'similar',headline:'Similar estimated exposure',detail:'No meaningful safety advantage measured over the quickest route.',time,percent};
}
