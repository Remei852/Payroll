import{r as n,j as e,H as l}from"./app-i7-6dvRw.js";function d({violations:t}){n.useEffect(()=>{const s=setTimeout(()=>{window.print()},500);return()=>clearTimeout(s)},[]);const a=s=>new Date(s).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),r=s=>{switch(s){case"Critical":return"text-red-900";case"High":return"text-red-700";case"Medium":return"text-yellow-700";case"Low":return"text-blue-700";default:return"text-gray-700"}};return e.jsxs(e.Fragment,{children:[e.jsx(l,{title:"Print Violation Notice"}),e.jsx("style",{children:`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .no-print {
                        display: none;
                    }
                }
                
                @page {
                    size: A4;
                    margin: 2cm;
                }
            `}),e.jsx("div",{className:"bg-white",children:t.map((s,i)=>e.jsxs("div",{className:`p-8 ${i<t.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"mb-8 border-b-2 border-gray-800 pb-4",children:[e.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:"ATTENDANCE VIOLATION NOTICE"}),e.jsxs("p",{className:"mt-1 text-sm text-gray-600",children:["Generated on ",a(new Date)]})]}),e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"mb-3 text-lg font-semibold text-gray-900",children:"Employee Information"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium text-gray-600",children:"Name:"}),e.jsxs("p",{className:"text-base text-gray-900",children:[s.employee.first_name," ",s.employee.last_name]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium text-gray-600",children:"Employee ID:"}),e.jsx("p",{className:"text-base text-gray-900",children:s.employee.employee_code})]})]})]}),e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"mb-3 text-lg font-semibold text-gray-900",children:"Violation Details"}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-sm font-medium text-gray-600",children:"Type:"}),e.jsx("span",{className:"text-base text-gray-900",children:s.violation_type})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-sm font-medium text-gray-600",children:"Date:"}),e.jsx("span",{className:"text-base text-gray-900",children:a(s.violation_date)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-sm font-medium text-gray-600",children:"Severity:"}),e.jsx("span",{className:`text-base font-semibold ${r(s.severity)}`,children:s.severity})]})]})]}),s.description&&e.jsxs("div",{className:"mb-6",children:[e.jsx("h2",{className:"mb-3 text-lg font-semibold text-gray-900",children:"Description"}),e.jsx("p",{className:"text-base text-gray-700 whitespace-pre-wrap",children:s.description})]}),e.jsx("div",{className:"mt-12 border-t border-gray-300 pt-4",children:e.jsx("p",{className:"text-xs text-gray-500",children:"This is an official attendance violation notice. Please review and take necessary action."})})]},s.id))})]})}export{d as default};
