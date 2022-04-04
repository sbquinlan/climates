float sum(vec2 v) { return v.x + v.y;  }
float sum(vec3 v) { return sum(v.xy) + v.z; }
float sum(vec4 v) { return sum(v.xy) + sum(v.wz); }

float vmax(vec2 v) { return max(v.x, v.y); }
float vmax(vec3 v) { return max(vmax(v.xy), v.z); }
float vmax(vec4 v) { return max(vmax(v.xy), vmax(v.wz)); }

float vmin(vec2 v) { return min(v.x, v.y); }
float vmin(vec3 v) { return min(vmin(v.xy), v.z); }
float vmin(vec4 v) { return min(vmin(v.xy), vmin(v.wz)); }

float mean(vec2 v) { return sum(v) * 0.5; }
float mean(vec3 v) { return sum(v) * 1./3.; }
float mean(vec4 v) { return sum(v) * 0.25; }

#define ternary(G, A, B) ( mix((A), (B), float(G)) )

// these assume inputs are cfloats
#define and(A, B) ( (A) * (B) )
#define or(A, B) ( (A) + (B) )

#define eq(A, B) ( not(neq( (A), (B) )) )
#define neq(A, B) ( abs(sign( (A) - (B) )) )
#define not(A) ( 1. - (A) )

#define gte(A, B) ( step((A), (B)) )
#define gt(A, B) ( step(1., sign((A) - (B))) )

#define lte(A, B) ( gt((B), (A)) )
#define lt(A, B) ( gte((B), (A)) )

vec4 koppengieger(
  vec4 temp_1, vec4 temp_2, vec4 temp_3,
  vec4 prec_1, vec4 prec_2, vec4 prec_3
) {
  float front_temp_sum = sum(temp_1)    + sum(temp_2.xy);
  float back_temp_sum =  sum(temp_2.wz) + sum(temp_3);

  float alpha = 1.;
  // step(a, b) -> a >= b ? 1. : 0.
  // step(front, back) -> front >= back ? 1. : 0.
  // 1. means north hemi 0. means south hemi
  float sum_select = step(front_temp_sum, back_temp_sum);

  vec4 swap = prec_1;
  prec_1 = mix(prec_3, prec_1, sum_select);
  prec_2 = mix(prec_2.wzyx, prec_2, sum_select);
  prec_3 = mix(prec_1, prec_3, sum_select);

  // temp stuff
  float MAT = (front_temp_sum + back_temp_sum) / 12.;
  float Tmon10 =
    sum(vec4(greaterThan(temp_1, vec4(10.)))) +
    sum(vec4(greaterThan(temp_2, vec4(10.)))) +
    sum(vec4(greaterThan(temp_3, vec4(10.))));
  float Thot = vmax(vec3(vmax(temp_1), vmax(temp_2), vmax(temp_3)));
  float Tcold = vmin(vec3(vmin(temp_1), vmin(temp_1), vmin(temp_1)));

  // prec stuff
  float MAP = sum(prec_1) + sum(prec_2) + sum(prec_3);
  float Pdry = vmin(vec3(vmin(prec_1), vmin(prec_2), vmin(prec_3)));
  float Pw = sum(prec_1) + sum(prec_2.xy);
  float Pwdry = min(vmin(prec_1), vmin(prec_2.xy));
  float Pwwet = max(vmax(prec_1), vmax(prec_2.xy));
  float Ps = sum(prec_2.zw) + sum(prec_3);
  float Psdry = min(vmin(prec_2.zw), vmin(prec_3));
  float Pswet = max(vmax(prec_2.zw), vmax(prec_3));

  float double_MAT = 2. * MAT;
  float Pthresh = ternary(
    (Pw * 2.333) > Ps, // winter is less than 30% of MAP
    double_MAT,
    ternary(
      (Ps * 2.333) > Pw,
      double_MAT + 28.,
      double_MAT + 14.
    )
  );

  bool B = MAP < (10. * Pthresh);
  bool BW = B && MAP < (5. * Pthresh);
  bool BS = B && !BW;
  bool h = MAT >= 18.;

  bool BWh = BW && h;
  bool BWk = BW && !h;
  bool BSh = BS && h;
  bool BSk = BS && !h;

  bool A = !B && Tcold >= 18.;
  bool Af = A && Pdry >= 60.;
  bool Am = A && !Af && Pdry >= (100. - MAP / 25.);
  bool Aw = A && !Af && !Am;

  // The Ps <= Pw is something that the GloH20 people added
  // for overlap between s and w
  bool s = Psdry < 40. && Psdry < (Pwwet / 3.) && Ps <= Pw;
  bool w = !s && Pwdry < (Pswet / 10.);
  bool f = !s && !w;

  bool a = Thot >= 22.;
  bool b = !a && Tmon10 >= 4.;
  bool c = !a && !b && Tmon10 >= 1.;

  bool C = !B && Thot > 10. && Tcold > 0. && Tcold < 18.;
  bool Cs = C && s;
  bool Cw = C && w;
  bool Cf = C && f;

  bool Csa = Cs && a;
  bool Csb = Cs && b;
  bool Csc = Cs && c;
  bool Cwa = Cw && a;
  bool Cwb = Cw && b;
  bool Cwc = Cw && c;
  bool Cfa = Cf && a;
  bool Cfb = Cf && b;
  bool Cfc = Cf && c;

  bool d = !a && !b && Tcold < -38.;
  c = !a && !b && !d;

  bool D = !B && Thot > 10. && Tcold <= 0.;
  bool Ds = D && s;
  bool Dw = D && w;
  bool Df = D && f;
  bool Dsa = Ds && a;
  bool Dsb = Ds && b;
  bool Dsc = Ds && c;
  bool Dsd = Ds && d;
  bool Dwa = Dw && a;
  bool Dwb = Dw && b;
  bool Dwc = Dw && c;
  bool Dwd = Dw && d;
  bool Dfa = Df && a;
  bool Dfb = Df && b;
  bool Dfc = Df && c;
  bool Dfd = Df && d;

  bool E = !B && Thot <= 10.;
  bool ET = E && Thot > 0.;
  bool EF = Thot <= 0.;
  
  return
    float(Af)  * vec4(vec3(0x00, 0x00, 0xFE) / 255., alpha) +
    float(Am)  * vec4(vec3(0x00, 0x77, 0xFD) / 255., alpha) +
    float(Aw)  * vec4(vec3(0x45, 0xA9, 0xF9) / 255., alpha) +
    float(BWh) * vec4(vec3(0xFD, 0x00, 0x00) / 255., alpha) +
    float(BWk) * vec4(vec3(0xFE, 0x95, 0x95) / 255., alpha) +
    float(BSh) * vec4(vec3(0xF4, 0xA4, 0x00) / 255., alpha) +
    float(BSk) * vec4(vec3(0xFE, 0xDB, 0x63) / 255., alpha) +
    float(Csa) * vec4(vec3(0xFE, 0xFE, 0x00) / 255., alpha) +
    float(Csb) * vec4(vec3(0xC6, 0xC6, 0x00) / 255., alpha) +
    float(Csc) * vec4(vec3(0x88, 0x88, 0x57) / 255., alpha) +
    float(Cwa) * vec4(vec3(0x95, 0xFD, 0x95) / 255., alpha) +
    float(Cwb) * vec4(vec3(0x63, 0xC7, 0x63) / 255., alpha) +
    float(Cwc) * vec4(vec3(0x20, 0x7B, 0x20) / 255., alpha) +
    float(Cfa) * vec4(vec3(0xC7, 0xFD, 0x4F) / 255., alpha) +
    float(Cfb) * vec4(vec3(0x66, 0xFF, 0x35) / 255., alpha) +
    float(Cfc) * vec4(vec3(0x30, 0xC7, 0x00) / 255., alpha) +
    float(Dsa) * vec4(vec3(0xFE, 0x00, 0xFE) / 255., alpha) +
    float(Dsb) * vec4(vec3(0xC7, 0x00, 0xC7) / 255., alpha) +
    float(Dsc) * vec4(vec3(0x94, 0x31, 0x94) / 255., alpha) +
    float(Dsd) * vec4(vec3(0x9B, 0x68, 0x9B) / 255., alpha) +
    float(Dwa) * vec4(vec3(0xAF, 0xB5, 0xFF) / 255., alpha) +
    float(Dwb) * vec4(vec3(0x59, 0x76, 0xD9) / 255., alpha) +
    float(Dwc) * vec4(vec3(0x49, 0x4F, 0xB2) / 255., alpha) +
    float(Dwd) * vec4(vec3(0x31, 0x00, 0x85) / 255., alpha) +
    float(Dfa) * vec4(vec3(0x00, 0xFE, 0xFE) / 255., alpha) +
    float(Dfb) * vec4(vec3(0x36, 0xC7, 0xFE) / 255., alpha) +
    float(Dfc) * vec4(vec3(0x03, 0x80, 0x80) / 255., alpha) +
    float(Dfd) * vec4(vec3(0x00, 0x48, 0x61) / 255., alpha) +
    float(ET)  * vec4(vec3(0xB1, 0xB1, 0xB1) / 255., alpha) +
    float(EF)  * vec4(vec3(0x65, 0x65, 0x65) / 255., alpha);
}

#pragma glslify: export(koppengieger)