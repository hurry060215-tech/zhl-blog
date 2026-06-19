即<span style="background:#fff88f">多重检验校正（Multiple Testing Correction）</span>的方法主要分为两大类：控制 **FWER（全家族误差率）** 和控制 **FDR（错误发现率）**。
## P 值算法
在 R 语言和生物信息学分析中，多重检验校正（Multiple Testing Correction）的方法主要分为两大类：控制 **FWER（全家族误差率）** 和控制 **FDR（错误发现率）**。

以下是 `p.adjust.method` 参数中常见的算法及其特点：

---

### 1. 错误发现率控制类 (FDR-controlling)

这类方法在单细胞和转录组分析中最常用，因为它们在统计学效能（Power）和严谨性之间取得了平衡。

- **BH (Benjamini-Hochberg) / "fdr"**
    
    - **原理：** 允许少量的假阳性，确保在被判定为“显著”的基因中，假阳性的比例不超过设定阈值。
        
    - **特点：** 比较温和。如果你的目标是筛选尽可能多的潜在差异基因进行后续验证，这是首选。
        
- **BY (Benjamini-Yekutieli)**
    
    - **特点：** BH 方法的加强版。它考虑了变量之间可能存在的**相关性**。在基因表达数据中，很多基因是协同表达的，BY 在这种情况下比 BH 更严谨，但比 Bonferroni 宽松。
        

---

### 2. 全家族误差率控制类 (FWER-controlling)

这类方法极其严苛，目标是确保在成千上万次测试中，**连一个假阳性都不要出现**。

- **Bonferroni (Seurat 默认)**
    
    - **原理：** $p_{\text{adj}} = p \times m$（$m$ 为测试的基因总数）。
        
    - **特点：** 最保守、最严厉。由于单细胞测试的基因通常过万，Bonferroni 会导致很多真实的差异基因因为达不到极小的阈值而被剔除。
        
- **Holm (Holm-Bonferroni)**
    
    - **原理：** 逐步递减式校正。先对 $p$ 值排序，对最小的 $p$ 值用最严厉的倍数，随排序往后倍数逐渐减小。
        
    - **特点：** 比 Bonferroni 稍强，且在统计学上始终有效，是 Bonferroni 的优选替代方案。
        
- **Hochberg / Hommel**
    
    - **特点：** 与 Holm 类似但计算更复杂，通常在处理具有特定相关性的数据时比 Holm 更灵敏。
        

---

### 算法严厉程度对比

通常情况下，严厉程度排序如下（由严到松）：

$$\text{Bonferroni} > \text{Holm} > \text{BY} > \text{BH (FDR)}$$

---

### 总结建议：我该选哪种？

|**场景**|**推荐算法**|**原因**|
|---|---|---|
|**单细胞筛选 Marker 基因**|**Bonferroni**|细胞数量多，差异通常很显著，用最严的标准筛选出的基因最稳健。|
|**探索性研究 / 寻找通路**|**BH (FDR)**|避免漏掉重要的生物学信号，允许极小比例的误差。|
|**严谨的临床生物标志物鉴定**|**Holm**|兼顾严谨性和一定的统计效能。|

### 如何在 R 中一键对比？

如果你想看看不同算法对你结果的影响，可以运行以下代码：

R

```
p_values <- c(0.001, 0.005, 0.01, 0.04, 0.1)
# 同时对比多种方法
results <- data.frame(
  raw = p_values,
  bonferroni = p.adjust(p_values, method = "bonferroni"),
  BH = p.adjust(p_values, method = "BH"),
  holm = p.adjust(p_values, method = "holm")
)
print(results)
```


## 在 R 语言的单细胞分析中（以最常用的 **Seurat** 包为例），查看和设置 $p$ 值校正方法非常直接。

### 1. 默认方法是什么？

在 Seurat 中，当你运行 `FindMarkers()` 或 `FindAllMarkers()` 函数时，默认使用的校正方法就是 **Bonferroni 校正**。

> **注意：** 这与很多体外转录组（Bulk RNA-seq）工具（如 DESeq2 默认使用 BH/FDR）不同。Seurat 默认选用了更严格的 Bonferroni，因为它处理的测试数量（基因数）极大。

---

### 2. 如何在代码中查看或修改？

你可以通过参数 `p.adjust.method` 来控制校正算法。

```
# 运行差异分析
markers <- FindMarkers(
  object = your_seurat_object,
  ident.1 = "GroupA",
  ident.2 = "GroupB",
  p.adjust.method = "bonferroni" # 这里可以修改，默认为 "bonferroni"
)

# 查看结果前几行
head(markers)
```

可选的校正方法：

R 基础包 stats 提供的所有方法都可以直接填入，包括：

- `"bonferroni"`：最保守。
    
- `"fdr"` 或 `"BH"`：**这是你之前提到的 Benjamini-Hochberg 方法**，通常能找到更多差异基因。
    
- `"holm"`：比 Bonferroni 稍强，但比 FDR 严。
    
- `"none"`：不进行任何校正。
    

---

### 3. 如何在结果表格中区分？

运行完函数后，返回的 `markers` 表格通常包含两列关于显著性的指标：

|**列名**|**含义**|
|---|---|
|**p_val**|原始 $p$ 值（未经过多重检验校正）。|
|**p_val_adj**|**校正后的 $p$ 值**。这就是你在火山图纵坐标使用的值（对应 FDR 或 Bonferroni）。|

---

### 4. 怎么确认我之前的分析用了哪种？

如果你已经拿到了一个现成的 `markers` 数据框，想确认它是怎么算的，可以观察 `p_val` 和 `p_val_adj` 的关系：

- **如果是 Bonferroni：** `p_val_adj` 应该是 `p_val` 乘以总基因数（最大为 1）。
    
- **如果是 BH (FDR)：** 对应关系会复杂一些（取决于排序后的秩次）。
    

---

### 5. 可视化建议

在画火山图时，如果你的差异基因太少，建议将 `p.adjust.method` 改为 **"fdr"**：
```
# 使用 FDR (BH方法) 重新寻找标记基因
markers_fdr <- FindMarkers(your_seurat_object, ident.1 = "A", p.adjust.method = "fdr")

# 绘图时纵坐标取 -log10(p_val_adj)
```