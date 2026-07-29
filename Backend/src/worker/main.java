import static java.util.Collections.swap;

public class Main {

    int size ;
    int [] stack ;
    int top ;

    Main(size){
        this.size = size;
        top = -1;
    }
    
    public void add(num){
        top++;
        stack[top] = num;
    }
    
    public void isEmpty(){
        if(top == -1){
            System.out.println("Stack Is Empty");
        }else{
            System.out.println("String is not empty");
        }
    }
    
    public void delete(){
        if(top == -1){
            System.out.println("Stack is empty u cant delete");
        }else{
            top--;
        }
    }
    
    public void display(){
        
        for(int i = top ; i >0 ; i--){
            System.out.println("The stack at index : "+i+ "is "+ stack[i]);
        }
    }
    
    public static void main(String[] args) {


        Main s = new Main();
        


    }
}