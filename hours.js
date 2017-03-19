function getOriginalHours(entry){
    var delta = entry.end - entry.start;
    if (delta <= 0) {
        return 0;      
    }
    return Math.floor(delta/1000/60)/60;
}

function getHours(entry){
    if (entry.hasOwnProperty("hours")){
        if (entry.hours!=""){
            return Math.floor(parseFloat(entry.hours)*60)/60;
        }
    }
    return getOriginalHours(entry);
}

function getTotalHours(records){
    var total=0.0;
    for (var i=0;i<records.length;i++){
        total+=getHours(records[i]);
    }
    return total;
}

var STATUS_NOT_WORKING=0;
var STATUS_WORKING    =1;
var STATUS_UNCLOSED   =2;

function getPeriodStatus(records){
    if (records.length == 0){
        return STATUS_NOT_WORKING;
    }
    else{
        var entry = records[records.length-1];
        var delta = entry.end - entry.start;
        if (delta>0){
            return STATUS_NOT_WORKING;
        }
        delta = Date.now() - entry.start;
        if (delta > 0 && delta < 20*60*60*1000){
            return STATUS_WORKING;
        }
        return STATUS_UNCLOSED;
    }
}

function formatTime(datems){
    var d = new Date(datems);
    var m=d.getMinutes();
    if (m==0){
        m="00";
    }
    else if (m<10){
        m="0"+m;
    }
    else{
        m=""+m;
    }
    return d.getHours()+":"+m;
}
function formatHours(t){
    var h=Math.floor(t);
    var m=Math.floor(Math.floor((t-h)*60));
    if (m<10){m="0"+m;}
    return h+":"+m;
}

Vue.component('period-entry', {
    props:['entry'],
    template: '<div>\
<div class="a">{{date}}</div>\
<span class="b">{{startTime}}</span>\
<span class="b"><span v-if="endTimeValid">{{endTime}}</span><span v-else>-</span></span>\
<span class="c"><span v-if="endTimeValid">{{originalHours}}</span><span v-else>-</span></span>\
<span class="d">{{hours}}</span>\
<span class="e"></span>\
</div>',
    computed:{
        date:function(){
            var d = new Date(this.entry.start);
            return ""+d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear()+" ("+d.getHours()+":"+d.getMinutes()+")";
        },      
        startTime:function(){
            return formatTime(this.entry.start);
        },      
        endTime:function(){
            return formatTime(this.entry.end);
        },
        endTimeValid:function(){
            var delta = this.entry.end - this.entry.start;
            return delta>0;
        },
        originalHours:function(){
            return formatHours(getOriginalHours(this.entry));
        },
        hours:function(){
            return formatHours(getHours(this.entry));
        }
    }
});

Vue.component('period-overview', {
    props:['user','period'],
  //template: '<h1>{{user}}</h1>'
    template: '<div>\
    <h2>{{period.month}}/{{period.year}}</h2>\
    <ul>\
        <li v-for="r in period.records[user]"><period-entry :entry="r" editable="true"></period-entry></li>\
    </ul>\
    <h2>Total:&nbsp;&nbsp;{{formatHours(total)}}</h2>\
    </div>',
    computed:{
        total:function(){
            if (this.period.records.hasOwnProperty(this.user)){
                return getTotalHours(this.period.records[this.user]);    
            }
            else{
                return 0;
            }
        }
    }

});


var App = new Vue({
    el: '#app',
    methods:{
        start:function (name){
            if (!this.periods[this.periods.length-1].records.hasOwnProperty(name)){
                this.periods[this.periods.length-1].records[name]=[];
            }
            this.periods[this.periods.length-1].records[name].push({start:Date.now(),end:0});
            this.mode=3;
            this.store();
        },
        end:function (name){            
            var records = this.periods[this.periods.length-1].records[name];
            var record_index = records.length-1;
            var record  = records[record_index];
            record["end"] = Date.now();
            this.periods[this.periods.length-1].records[name][record_index]=record;
            this.mode=4;
            this.store();
        },
        getLastPeriod:function(){
            var period = this.periods[this.periods.length-1];
            var date = new Date(Date.now());
            var year = date.getFullYear();
            var month = date.getMonth()+1;
            if (period.year==year && period.month==month){
                for (var i=0;i<this.users.length;i++){
                    var user=this.users[i];
                    if (!period.records.hasOwnProperty(user.name)){
                        period.records[user.name] = [];                        
                    }
                }

                return period;
            }
            else{
                period={year:year,month:month,records:{}};
                for (var i=0;i<this.users.length;i++){
                    var user=this.users[i];
                    period.records[user.name] = [];
                }
                this.periods.push(period);
                return period;
            }
            return this.periods[this.periods.length-1];
            
        },
        setUser:function(user){
            this.user=user;
            this.mode=2;
        },
        exportData:function(){
            return {users:this.users,periods:this.periods};
        },
        importData:function(data){
            this.users=data.users;
            this.periods=data.periods;
            this.user=null;            
        },
        adminLogin:function(){
            if (this.adminpass=="raneejar1234"){
                this.admin=Date.now();
            }
            this.adminpass="";
        },
        store:function(){
            localStorage.setItem("hours",this.dataString);
        },
        restore:function(){
            var data = localStorage.getItem("hours");
            if (data!=null){
                this.dataString=data;                
            }
        },
        
    },    
    computed:{
        lastPeriod:function(){
            return this.getLastPeriod();
        },
        previousPeriod:function(){
            this.getLastPeriod();
            if (this.periods.length <=1){
                return this.getLastPeriod();
            }
            return this.periods[this.periods.length-2];
        },
        periodStatus:function(){
            return getPeriodStatus(this.getLastPeriod().records[this.user.name]);
        },
        periodStatusMessage:function(){
            return "OK";
        },
        dataString:{
            get:function(){
                return JSON.stringify(this.exportData());
            },
            set:function(data){
                this.importData(JSON.parse(data));
            }
        },
        isAdmin:function(){
            return Date.now()-this.admin<30*60*1000;
        }
    },
    created:function(){
        this.user=this.users[0];
        this.restore();
    },
    data:{
        mode:1,
        user:null,
        admin:0,
        adminpass:"",
        users:[
            {name:"Aom"},
            {name:"Bindu"},
            {name:"Hsin Li"},
            {name:"Kiran"},
            {name:"Kurt"}
        ],
        periods:[
            {
                year:2017,
                month:1,
                records:{
/*                    "Aom":[{start:1,end:2},{start:3,end:4},{start:5,end:6}]*/
                }
            }
        ]        
    }
});
