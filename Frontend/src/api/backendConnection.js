import axios from 'axios'
import {supabaseClient} from '@supabase/supabase-js'

const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
    headers:{
        "Content-Type":"application/json"
    },
    timeout:30000,
})

//for every request going to backend withthis httpclient get the credentials from supabase
//before running any backend fxn run this fxn
httpClient.interceptors.request.use(async(config)=>{

    console.log(`This is the configuration during intercepor of request in http client:${config}`)
    const {data:{session}}= await supabaseClient.auth.getSession()

    if(session?.access_token){
        config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
})


httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }

    const normalizedError = new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Request failed",
    );

    normalizedError.status = error.response?.status;
    normalizedError.response = error.response;

    return Promise.reject(normalizedError);
  },
);
export default httpClient