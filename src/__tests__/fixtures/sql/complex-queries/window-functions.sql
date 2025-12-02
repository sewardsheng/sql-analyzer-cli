-- 复杂查询：窗口函数测试用例
-- 问题描述：复杂窗口函数使用，包括排名、聚合、分析函数等

-- 1. 基本窗口函数 - ROW_NUMBER
SELECT
    employee_id,
    department_id,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank_in_dept
FROM employees;

-- 2. RANK 和 DENSE_RANK
SELECT
    employee_id,
    department_id,
    salary,
    RANK() OVER (ORDER BY salary DESC) as rank_all,
    DENSE_RANK() OVER (ORDER BY salary DESC) as dense_rank_all
FROM employees;

-- 3. 分位数函数
SELECT
    product_id,
    category_id,
    price,
    NTILE(4) OVER (PARTITION BY category_id ORDER BY price) as price_quartile
FROM products;

-- 4. LAG 和 LEAD 函数
SELECT
    order_id,
    order_date,
    amount,
    LAG(amount, 1) OVER (ORDER BY order_date) as prev_amount,
    LEAD(amount, 1) OVER (ORDER BY order_date) as next_amount
FROM orders;

-- 5. FIRST_VALUE 和 LAST_VALUE
SELECT
    employee_id,
    salary,
    FIRST_VALUE(salary) OVER (ORDER BY salary DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as highest_salary,
    LAST_VALUE(salary) OVER (ORDER BY salary DESC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as lowest_salary
FROM employees;

-- 6. 聚合窗口函数
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) as running_total,
    AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) as moving_avg
FROM orders;

-- 7. 复杂窗口框架
SELECT
    date,
    sales,
    SUM(sales) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as 7_day_sum,
    AVG(sales) OVER (ORDER BY date RANGE BETWEEN INTERVAL '30' DAY PRECEDING AND CURRENT ROW) as 30_day_avg
FROM daily_sales;

-- 8. 多个窗口函数组合
SELECT
    employee_id,
    department_id,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as dept_rank,
    PERCENT_RANK() OVER (PARTITION BY department_id ORDER BY salary) as dept_percentile,
    CUME_DIST() OVER (ORDER BY salary) as overall_percentile
FROM employees;

-- 9. 复杂条件窗口函数
SELECT
    product_id,
    category_id,
    sales,
    SUM(sales) OVER (
        PARTITION BY category_id
        ORDER BY sales DESC
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as cumulative_sales
FROM products;

-- 10. 窗口函数与JOIN结合
SELECT
    e.employee_id,
    e.name,
    d.department_name,
    e.salary,
    AVG(e.salary) OVER (PARTITION BY e.department_id) as dept_avg_salary,
    e.salary - AVG(e.salary) OVER (PARTITION BY e.department_id) as salary_diff
FROM employees e
JOIN departments d ON e.department_id = d.id;

-- 11. 动态窗口框架
SELECT
    date,
    revenue,
    SUM(revenue) OVER (
        ORDER BY date
        ROWS BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW
    ) as 7_day_rolling_sum,
    COUNT(*) OVER (
        ORDER BY date
        RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW
    ) as 7_day_count
FROM financial_data;

-- 12. 嵌套窗口函数
SELECT
    employee_id,
    department_id,
    salary,
    dept_rank,
    CASE
        WHEN dept_rank <= 3 THEN 'Top 3'
        WHEN dept_rank <= 10 THEN 'Top 10'
        ELSE 'Others'
    END as performance_tier
FROM (
    SELECT
        employee_id,
        department_id,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as dept_rank
    FROM employees
) ranked_employees;

-- 13. 复杂分析查询
WITH dept_stats AS (
    SELECT
        department_id,
        COUNT(*) as employee_count,
        AVG(salary) as avg_salary,
        STDDEV(salary) as salary_stddev
    FROM employees
    GROUP BY department_id
)
SELECT
    e.employee_id,
    e.name,
    e.salary,
    ds.avg_salary,
    ds.salary_stddev,
    (e.salary - ds.avg_salary) / ds.salary_stddev as z_score,
    PERCENT_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary) as dept_percentile
FROM employees e
JOIN dept_stats ds ON e.department_id = ds.department_id
WHERE ABS((e.salary - ds.avg_salary) / ds.salary_stddev) > 2;

-- 14. 时间序列窗口分析
SELECT
    date,
    product_id,
    sales,
    LAG(sales, 1) OVER (PARTITION BY product_id ORDER BY date) as prev_day_sales,
    (sales - LAG(sales, 1) OVER (PARTITION BY product_id ORDER BY date)) / LAG(sales, 1) OVER (PARTITION BY product_id ORDER BY date) as daily_growth,
    SUM(sales) OVER (PARTITION BY product_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as 7_day_avg
FROM product_sales
ORDER BY product_id, date;

-- 15. 复杂业务逻辑窗口查询
SELECT
    customer_id,
    order_id,
    order_date,
    amount,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) as order_sequence,
    SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_spend,
    AVG(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as recent_avg,
    CASE
        WHEN ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) = 1 THEN 'Latest'
        WHEN SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) > 1000 THEN 'VIP'
        ELSE 'Regular'
    END as customer_segment
FROM orders
ORDER BY customer_id, order_date;