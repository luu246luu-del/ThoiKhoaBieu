import type { Task } from '@/types';
import { Timestamp } from 'firebase/firestore';

/** Du lieu lo trinh duoc luu thep tai khoan tai users/{uid}/goals/{planId}. */
export interface RoadmapStep {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
}
export interface RoadmapModule {
  id: string;
  title: string;
  steps: RoadmapStep[];
}
export interface RoadmapProject {
  id: string;
  title: string;
  description: string;
  deadline: string;
  skills: string[];
  modules: RoadmapModule[];
}
export interface RoadmapPlan {
  id: string;
  kind: 'vantien-roadmap-v2';
  title: string;
  description: string;
  categoryId: string;
  projects: RoadmapProject[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export const PRESET_PLAN_IDS = ['roadmap_osat_v2','roadmap_korean_v2','roadmap_english_v2'] as const;

const step = (id:string,title:string): RoadmapStep => ({id,title,completed:false});
const makeModule = (id:string,title:string,steps:string[]):RoadmapModule => ({
  id,title,steps:steps.map((s,i)=>step(`${id}_step_${i+1}`,s)),
});
const project = (id:string,title:string,description:string,deadline:string,skills:string[],modules:RoadmapModule[]):RoadmapProject => ({id,title,description,deadline,skills,modules});

/** Ban mau chi hien thi; KHONG ghi de du lieu nguoi dung khi dang nhap. */
export function getPresetRoadmaps():RoadmapPlan[] {
  const now=Timestamp.now();
  return [
    {id:'roadmap_osat_v2',kind:'vantien-roadmap-v2',title:'Process Engineer (OSAT)',categoryId:'engineer',description:'5 dự án thực tế — hoàn thành trước 30/06/2027',createdAt:now,updatedAt:now,projects:[
      project('p1','Semiconductor Yield Analysis','Phân tích yield theo lô/wafer, Pareto phế phẩm, xác định công đoạn gây lỗi.','2026-11-30',['Excel Advanced','Pivot Table','Yield Formula','Pareto Chart'],[
        makeModule('p1_m1','Module 1: Làm sạch dataset sản xuất bán dẫn',['Thu thập dữ liệu và kiểm tra trường dữ liệu','Xử lý thiếu/trùng/ngoại lệ','Kiểm tra chất lượng dataset sau làm sạch']),
        makeModule('p1_m2','Module 2: Xây dựng bảng Pivot phân tích theo Batch/Wafer',['Chuẩn hóa Batch ID và Wafer ID','Tạo Pivot theo từng lô và wafer','Tính FPY và đối chiếu số liệu']),
        makeModule('p1_m3','Module 3: Vẽ biểu đồ Pareto và tính Cumulative Loss',['Tính tỷ trọng từng nhóm defect','Sắp xếp Pareto và tỷ lệ tích lũy','Nhận xét nhóm lỗi ưu tiên cải thiện']),
        makeModule('p1_m4','Module 4: Lập báo cáo kết luận cho Process Engineering',['Trình bày phương pháp phân tích','Tổng hợp số liệu và biểu đồ','Viết kết luận và đề xuất hành động']),
      ]),
      project('p2','Wire Bonding Defect Investigation','Điều tra nguyên nhân gốc rễ các lỗi non-stick on pad, lifted ball, broken wire.','2027-01-15',['Minitab','Root Cause Analysis','Ball Bond Shear Test','SEMI Standard'],[
        makeModule('p2_m1','Module 1: Phân loại cơ chế lỗi Wire Bonding theo SEMI',['Lập danh mục loại lỗi','Đọc quy định/tiêu chí chất lượng','Phân loại ảnh/mẫu lỗi thực tế']),
        makeModule('p2_m2','Module 2: Phân tích lực kéo và lực cắt (Wire Pull & Ball Shear Test)',['Thu thập kết quả thử nghiệm','Biểu diễn phân bố và xu hướng','Đối chiếu giới hạn chấp nhận']),
        makeModule('p2_m3','Module 3: Ứng dụng Ishikawa (Fishbone) và 5 Whys',['Lập sơ đồ Fishbone','Thực hiện phân tích 5 Whys','Đề xuất kiểm chứng nguyên nhân']),
      ]),
      project('p3','Statistical Process Control (SPC)','Đánh giá biến thiên quá trình bằng control chart, Cp/Cpk và cảnh báo sớm.','2027-02-28',['SPC','Cp/Cpk','Pp/Ppk','Control Charts'],[
        makeModule('p3_m1','Module 1: Cơ sở lý thuyết phân phối chuẩn và biến thiên quá trình',['Ôn thống kê mô tả','Đánh giá phân bố dữ liệu','Phân biệt common/special causes']),
        makeModule('p3_m2','Module 2: Thiết lập quy tắc Western Electric Rules kiểm soát biểu đồ',['Thiết lập control chart','Cài đặt quy tắc cảnh báo','Phân tích tín hiệu mất kiểm soát']),
        makeModule('p3_m3','Module 3: Đánh giá chỉ số năng lực Cpk > 1.33 & 1.67',['Tính Cp/Cpk từ dữ liệu','Đối chiếu mục tiêu năng lực','Viết khuyến nghị cải tiến']),
      ]),
      project('p4','Process Optimization Using DOE','Thiết kế thực nghiệm để tối ưu thông số quy trình.','2027-04-15',['DOE','Factorial Design','ANOVA','Response Surface'],[
        makeModule('p4_m1','Module 1: Full Factorial Design cho công đoạn hàn chip',['Chọn yếu tố và mức thí nghiệm','Lập ma trận thiết kế','Xác định response cần tối ưu']),
        makeModule('p4_m2','Module 2: Phân tích phương sai ANOVA tìm yếu tố ảnh hưởng chính',['Kiểm tra giả định ANOVA','Phân tích ảnh hưởng chính và tương tác','Giải thích p-value và effect size']),
        makeModule('p4_m3','Module 3: Tìm vùng tối ưu (Response Surface Methodology)',['Xây dựng bề mặt đáp ứng','Xác định vùng tối ưu','Lập kế hoạch xác nhận kết quả']),
      ]),
      project('p5','Automated Yield Monitoring Dashboard','Tự động ETL và trực quan hóa yield trong Power BI/GitHub.','2027-05-31',['Python','Power BI','SQL/Pandas','GitHub'],[
        makeModule('p5_m1','Module 1: Viết script Python tự động ETL dữ liệu wafer log',['Đọc/kiểm tra nguồn dữ liệu','Làm sạch và chuyển đổi bằng Pandas','Xuất bảng dữ liệu chuẩn hóa']),
        makeModule('p5_m2','Module 2: Thiết kế Dashboard Power BI tương tác cao',['Thiết kế mô hình dữ liệu','Tạo KPI và biểu đồ chính','Kiểm thử bộ lọc dashboard']),
        makeModule('p5_m3','Module 3: Hoàn thiện hồ sơ kỹ thuật GitHub chuyên nghiệp (30/06/2027)',['Viết README và kiến trúc','Đưa code/ảnh minh họa lên GitHub','Kiểm thử khả năng tái tạo kết quả']),
      ]),
    ]},
    {id:'roadmap_korean_v2',kind:'vantien-roadmap-v2',title:'Tiếng Hàn TOPIK 3',categoryId:'korean',description:'Ngữ pháp trung cấp, từ vựng và luyện đọc/nghe',createdAt:now,updatedAt:now,projects:[
      project('korean_core','Lộ trình TOPIK 3','6 giờ/tuần (mục tiêu tham khảo)', '', ['Ngữ pháp','Từ vựng','Đọc','Nghe'],[
        makeModule('kor_m1','Giai đoạn 1: Ngữ pháp trung cấp',['Lập danh sách cấu trúc cần học','Học ví dụ và tự đặt câu','Ôn tập bằng bài kiểm tra']),
        makeModule('kor_m2','Giai đoạn 2: Đọc TOPIK 3',['Làm đề theo từng dạng','Ghi chép từ vựng mới','Chữa lỗi và làm lại']),
        makeModule('kor_m3','Giai đoạn 3: Nghe TOPIK 3',['Nghe và ghi ý chính','Luyện nghe lại theo transcript','Làm đề và phân tích đáp án']),
      ]),
    ]},
    {id:'roadmap_english_v2',kind:'vantien-roadmap-v2',title:'Tiếng Anh TOEIC 450',categoryId:'english',description:'Luyện nghe, đọc và ngữ pháp nền tảng',createdAt:now,updatedAt:now,projects:[
      project('english_core','Lộ trình TOEIC 450','4 giờ/tuần (mục tiêu tham khảo)', '', ['Listening','Reading','Vocabulary'],[
        makeModule('eng_m1','Giai đoạn 1: Listening Part 1 & 2',['Nghe và đối chiếu đáp án','Phân tích lỗi nghe sai','Làm lại bộ câu khó']),
        makeModule('eng_m2','Giai đoạn 2: Ngữ pháp Part 5',['Ôn các chủ điểm nền tảng','Làm bài Part 5 theo chủ điểm','Tổng hợp lỗi sai và ôn lại']),
      ]),
    ]},
  ];
}
export function countSteps(plan:RoadmapPlan):{done:number;total:number} {
  let done=0,total=0;
  for (const p of plan.projects) for (const m of p.modules) for (const s of m.steps) {
    total++; if(s.completed)done++;
  }
  return {done,total};
}
export function projectSteps(project:RoadmapProject):{done:number;total:number} {
  let done=0,total=0;
  for (const m of project.modules)for(const s of m.steps){total++;if(s.completed)done++;}
  return {done,total};
}
export function percent(done:number,total:number):number {return total>0?Math.round(done*100/total):0;}

/** Doc tien do module cu tu Tasks trong lan luu dau tien, tranh mat tick da co. */
export function migrateLegacyModuleCompletion(plan:RoadmapPlan,tasks:Task[]):RoadmapPlan {
  if(plan.id!=='roadmap_osat_v2')return plan;
  return {...plan,projects:plan.projects.map(p=>({...p,modules:p.modules.map(m=>{
    const previouslyCompleted=tasks.some(t=>t.projectId===p.id && t.title===m.title && t.status==='completed');
    return previouslyCompleted ? {...m,steps:m.steps.map(s=>({...s,completed:true,completedAt:s.completedAt??Timestamp.now()}))}:m;
  })}))};
}
