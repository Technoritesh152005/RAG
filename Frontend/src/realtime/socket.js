import {io} from 'socket.io-client'
import {supabaseClient} from '../auth/auth'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"

let socket = null
export function getSocket(){

    if(!socket){
        socket = io(API_URL, {
            autoConnect:false,

            //weh socket.connect is then before it only socket object client is created , but after that u get auth related data
            auth: async (callback) => {
                try {
                    const { data } = await supabaseClient.auth.getSession();
                    callback({ token: data.session?.access_token });
                } catch {
                    callback({ token: undefined });
                }
            }
        })
    }

    return socket
}
