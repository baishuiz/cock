b.Module("pages.indexpage.loginform", function(require:any){
    require('pages.indexpage.restful');
    function test(){
        console.log("hello ts export test");
    }
    return test;
})