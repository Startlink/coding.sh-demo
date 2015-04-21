import java.util.*;
import java.math.*;

public class Main{
    public static void main(String args[]){
        Scanner cin = new Scanner(System.in);
	int t = cin.nextInt();
	while (t-- > 0) {
		int n,m;
		m = cin.nextInt();
		n = cin.nextInt();
		BigDecimal nn = new BigDecimal(n);
		BigDecimal mm = new BigDecimal(m);
		BigDecimal one = new BigDecimal(1);
		BigDecimal two = new BigDecimal(2);
		BigDecimal three = new BigDecimal(3);
		BigDecimal t1 = nn.divide(two);
		BigDecimal t2 = mm.multiply(mm).subtract(one);
		BigDecimal t3 = mm.multiply(three);
		t2 = t2.divide(t3,100,RoundingMode.HALF_UP);
		t1 = t1.add(t2);
//		t1 = t1.round(new MathContext(1, RoundingMode.HALF_UP));
		System.out.println(String.format("%.1f",t1));
	}
    }
}
