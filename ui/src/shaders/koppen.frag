precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D temp;
uniform sampler2D prec;
uniform float noData;

varying vec2 uv;

float sum(vec2 v) { return v.x + v.y;  }
float sum(vec3 v) { return sum(v.xy) + v.z; }
float sum(vec4 v) { return sum(v.xy) + sum(v.wz); }

float max(vec2 v) { return max(v.x, v.y); }
float max(vec3 v) { return max(max(v.xy), v.z); }
float max(vec4 v) { return max(max(v.xy), max(v.wz)); }

float min(vec2 v) { return min(v.x, v.y); }
float min(vec3 v) { return min(min(v.xy), v.z); }
float min(vec4 v) { return min(min(v.xy), min(v.wz)); }

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

void main() {
  float texel_width = 0.;//1. / (256. * 3.);

  vec4 temp_1 = texture2D(temp, uv);
  vec4 temp_2 = texture2D(temp, vec2(uv.x + texel_width, uv.y));
  vec4 temp_3 = texture2D(temp, vec2(uv.x + 2. * texel_width, uv.y));

  vec4 prec_1 = texture2D(prec, uv);
  vec4 prec_2 = texture2D(prec, vec2(uv.x + texel_width, uv.y));
  vec4 prec_3 = texture2D(prec, vec2(uv.x + 2. * texel_width, uv.y));

  float front_temp_sum = sum(temp_1)   + sum(temp_2.xy);
  float back_temp_sum =  sum(temp_3.wz) + sum(temp_3);

  float alpha = float(noData != temp_1.x);
  // step(a, b) -> a >= b ? 1. : 0.
  // step(front, back) -> front >= back : 1. : 0.
  // 1. means north hemi 0. means south hemi
  float sum_select = step(front_temp_sum, back_temp_sum);

  vec4 swap = prec_1;
  prec_1 = mix(prec_3, prec_1, sum_select);
  prec_3 = mix(prec_1, prec_3, sum_select);
  prec_2 = mix(vec4(prec_2.zw, prec_2.xy), prec_2, sum_select);

  // temp stuff
  float MAT = (front_temp_sum + back_temp_sum) * 1./12.;
  float Tmon10 =
    sum(vec4(greaterThan(temp_1, vec4(10.)))) +
    sum(vec4(greaterThan(temp_2, vec4(10.)))) +
    sum(vec4(greaterThan(temp_3, vec4(10.))));
  float Thot = max(vec3(max(temp_1), max(temp_2), max(temp_3)));
  float Tcold = min(vec3(min(temp_1), min(temp_1), min(temp_1)));

  // prec stuff
  float MAP = sum(prec_1) + sum(prec_2) + sum(prec_3);
  float Pdry = min(vec3(min(prec_1), min(prec_2), min(prec_3)));
  float Pw = sum(prec_1) + sum(prec_2.xy);
  float Pwdry = min(min(prec_1), min(prec_2.xy));
  float Pwwet = max(max(prec_1), max(prec_2.xy));
  float Ps = sum(prec_2.zw) + sum(prec_3);
  float Psdry = min(min(prec_2.zw), min(prec_3));
  float Pswet = max(max(prec_2.zw), max(prec_3));

  float double_MAT= 2. * MAT;
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
  bool s = Psdry < 40. && Psdry < Pwwet / 3. && Ps <= Pw;
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

  gl_FragColor =
    float(Af) * vec4(0.) +
    float(Am) * vec4(0.) +
    float(Aw) * vec4(0.) +
    float(BWh) * vec4(0.) +
    float(BWk) * vec4(0.) +
    float(BSh) * vec4(0., 0., 1., 1.) +
    float(BSk) * vec4(0., 1., 0., 1.) +
    float(Csa) * vec4(1., 0., 0., 1.) +
    float(Csb) * vec4(0.) +
    float(Csc) * vec4(0.) +
    float(Cwa) * vec4(0.) +
    float(Cwb) * vec4(0.) +
    float(Cwc) * vec4(0.) +
    float(Cfa) * vec4(0.) +
    float(Cfb) * vec4(0.) +
    float(Cfc) * vec4(0.) +
    float(Dsa) * vec4(0.) +
    float(Dsb) * vec4(0.) +
    float(Dsc) * vec4(0.) +
    float(Dsd) * vec4(0.) +
    float(Dwa) * vec4(0.) +
    float(Dwb) * vec4(0.) +
    float(Dwc) * vec4(0.) +
    float(Dwd) * vec4(0.) +
    float(Dfa) * vec4(0.) +
    float(Dfb) * vec4(0.) +
    float(Dfc) * vec4(0.) +
    float(Dfd) * vec4(0.) +
    float(ET) * vec4(1., 1., 0., 1.) +
    float(EF) * vec4(1., 0., 1., 1.);
}
